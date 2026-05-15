FROM gcc:11

# Create a non-root user
RUN useradd -m sandboxuser

# Set working directory
WORKDIR /home/sandboxuser/app

# Change ownership to sandboxuser
RUN chown sandboxuser:sandboxuser /home/sandboxuser/app

# Switch to non-root user
USER sandboxuser

# Keep the container alive or wait for commands
CMD ["bash"]
