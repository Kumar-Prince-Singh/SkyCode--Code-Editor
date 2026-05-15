const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

class BaseExecutor {
    constructor(languageConfig) {
        this.config = languageConfig;
        this.tempDir = path.join(__dirname, '..', 'temp');
        
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async execute(code, input) {
        const submissionId = uuidv4();
        const workspacePath = path.join(this.tempDir, submissionId);
        fs.mkdirSync(workspacePath, { recursive: true });

        const fileName = this.config.extension === 'java' ? 'Main.java' : `main.${this.config.extension}`;
        const filePath = path.join(workspacePath, fileName);
        const inputPath = path.join(workspacePath, 'input.txt');

        try {
            // Write code and input files
            fs.writeFileSync(filePath, code);
            fs.writeFileSync(inputPath, input || '');

            const startTime = Date.now();
            let result = {
                stdout: '',
                stderr: '',
                compileError: '',
                runtimeError: '',
                executionTime: 0
            };

            // Compilation Step
            if (this.config.compile) {
                const compileResult = await this.runInDocker(workspacePath, this.config.compile, true);
                if (compileResult.exitCode !== 0) {
                    result.compileError = compileResult.stderr || compileResult.stdout;
                    return result;
                }
            }

            // Execution Step
            const executionResult = await this.runInDocker(workspacePath, `${this.config.run} < input.txt`, false);
            const endTime = Date.now();

            result.stdout = executionResult.stdout;
            result.stderr = executionResult.stderr;
            result.executionTime = endTime - startTime;

            if (executionResult.exitCode !== 0) {
                result.runtimeError = executionResult.stderr || `Process exited with code ${executionResult.exitCode}`;
            }

            return result;

        } catch (error) {
            console.error(`Execution error: ${error.message}`);
            throw error;
        } finally {
            // Cleanup workspace
            this.cleanup(workspacePath);
        }
    }

    runInDocker(workspacePath, command, isCompile = false) {
        return new Promise((resolve) => {
            // Use path.resolve to get the absolute path for Docker volume mounting
            let absolutePath = path.resolve(workspacePath);
            
            // If running inside the backend container, map the internal app path back to the host path
            if (process.env.HOST_PROJECT_PATH) {
                const internalPath = process.cwd();
                absolutePath = absolutePath.replace(internalPath, process.env.HOST_PROJECT_PATH);
            }
            
            const normalizedPath = absolutePath.replace(/\\/g, '/');
            
            console.log(`Executing in Docker: ${command} at ${normalizedPath}`);

            const dockerCmd = [
                'run', '--rm',
                '--user', '0:0',
                '--network', 'none',
                '--memory', this.config.memoryLimit,
                '--cpus', '0.5',
                '-v', `"${normalizedPath}:/home/sandboxuser/app"`,
                '-w', '/home/sandboxuser/app',
                this.config.dockerImage,
                'bash', '-c', `"${command}"`
            ];

            const dockerProcess = spawn('docker', dockerCmd, { shell: true });

            dockerProcess.on('error', (err) => {
                console.error(`[DOCKER SPAWN ERROR]: ${err.message}`);
                resolve({ 
                    stdout: '', 
                    stderr: `Internal Error: Failed to start Docker. ${err.message}`, 
                    exitCode: -1 
                });
            });

            let stdout = '';
            let stderr = '';

            dockerProcess.stdout.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                console.log(`[DOCKER STDOUT]: ${chunk}`);
            });

            dockerProcess.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                console.log(`[DOCKER STDERR]: ${chunk}`);
            });

            const timeoutId = setTimeout(() => {
                dockerProcess.kill();
                resolve({ 
                    stdout, 
                    stderr: stderr + '\nExecution Timed Out', 
                    exitCode: 124 
                });
            }, (this.config.timeout + 15) * 1000);

            dockerProcess.on('close', (code) => {
                clearTimeout(timeoutId);
                console.log(`[DOCKER CLOSE]: Exit code ${code}`);
                resolve({ stdout, stderr, exitCode: code });
            });
        });
    }

    cleanup(workspacePath) {
        try {
            if (fs.existsSync(workspacePath)) {
                fs.rmSync(workspacePath, { recursive: true, force: true });
            }
        } catch (err) {
            console.error(`Failed to cleanup ${workspacePath}: ${err.message}`);
        }
    }
}

module.exports = BaseExecutor;
