# Deploying Shaji Pappan Link Estractor to Render

To deploy your application to Render, follow these simple steps:

### 1. Connect your GitHub Repository
*   Push your code to GitHub using the `push.sh` script I created for you.
*   Log in to [Render](https://dashboard.render.com/) and click **New > Web Service**.
*   Connect your GitHub account and select this repository.

### 2. Configure Service Settings
*   **Name**: `shaji-pappan-link-estractor`
*   **Environment**: `Docker`
*   **Region**: Choose the one closest to you.
*   **Branch**: `main`

### 3. Add Environment Variables
In the **Environment** tab on Render, add the following:
*   `DATABASE_URL`: Your PostgreSQL connection string (if using a database).
*   `NODE_ENV`: `production`

### 4. Health Check (Optional but Recommended)
*   Render will automatically use the `EXPOSE 5000` from the Dockerfile.
*   For the health check path, you can use: `/api/health`

### 5. Deploy
*   Click **Create Web Service**. Render will build the Docker container and deploy the app automatically.
*   Once finished, your app will be live at a `.onrender.com` URL!

### Monitoring
You can always check the status of your live app by visiting `your-app-url.onrender.com/health`.
