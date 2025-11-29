FROM mongo:7

# Copy dump into image
COPY dump/ /dump/

# Restore dump when the container starts
CMD ["bash", "-c", "mongod --bind_ip_all & sleep 5 && mongorestore /dump --drop && tail -f /dev/null"]
