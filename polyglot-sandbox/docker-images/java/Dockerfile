FROM amazoncorretto:17

# Create a non-root user
RUN yum install -y shadow-utils && useradd -m sandboxuser

WORKDIR /home/sandboxuser/app
RUN chown sandboxuser:sandboxuser /home/sandboxuser/app

USER sandboxuser

CMD ["bash"]
