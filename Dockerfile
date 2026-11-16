FROM node:18

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy all files
COPY . .

# Cloud Run uses PORT from env
EXPOSE 8080

# Start server
CMD ["npm", "start"]