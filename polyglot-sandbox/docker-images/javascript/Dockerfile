FROM node:18-slim

# Create a non-root user
RUN useradd -m sandboxuser

WORKDIR /home/sandboxuser/app
RUN chown sandboxuser:sandboxuser /home/sandboxuser/app

USER sandboxuser

CMD ["bash"]
