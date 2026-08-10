# Full-Stack Real-Time Chat Application

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern, robust, and feature-rich real-time chat application built with **Spring Boot** and **React**. This platform allows users to connect with friends, engage in one-on-one direct messaging, and create dynamic group chats with rich media sharing capabilities.

## Key Features

* **Real-Time Messaging**: Lightning-fast messaging powered by WebSockets and STOMP.
* **Rich Media Sharing (Up to 150MB)**: Send high-resolution images, videos (with built-in playback), and documents directly in chats.
* **Direct & Group Chats**: Seamless 1-on-1 conversations and rich group chat capabilities.
* **Smart Group Invitations**: Send, accept, and decline group invitations directly through interactive chat messages.
* **System Event Notifications**: Live chat badges for users joining, leaving, or being removed from groups.
* **Friend System**: Search for users and send/manage friend requests.
* **Message Management**: Edit and delete your sent messages in real-time.
* **Rich Notifications**: In-app popout toasts, audio chimes, and browser desktop notifications.
* **Authentication & Security**: Secure JWT-based authentication, complete with email verification, password recovery, and **Two-Factor Authentication (2FA)**.
* **Profile Customization & Webcam Integration**: Personalize your account by uploading profile pictures, generating fallback avatars, or taking live photos using the built-in webcam integration.

## Technology Stack

### Frontend
* **Framework**: React 18 with TypeScript
* **Build Tool**: Vite
* **Styling**: Tailwind CSS & Headless UI
* **Icons**: Heroicons
* **Networking**: Axios & `@stomp/stompjs`
* **Media & APIs**: HTML5 Video/Canvas APIs (Webcam), FormData (File Uploads)
* **Routing**: React Router DOM

### Backend
* **Framework**: Spring Boot 3 (Java 17)
* **Security**: Spring Security & JWT
* **Database**: PostgreSQL & Spring Data JPA
* **Real-Time**: Spring WebSocket
* **Email Servicing**: JavaMailSender
* **File Management**: MultipartFile processing and localized secure file storage

---

## Local Development Setup

### Prerequisites
* Java 17+
* Node.js 18+
* PostgreSQL 14+
* Maven

### 1. Database Setup
1. Ensure PostgreSQL is running on your local machine.
2. Create a new database named `chatapp`:
   ```sql
   CREATE DATABASE chatapp;
   ```

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Configure your environment variables or update `src/main/resources/application.properties` with your PostgreSQL credentials (`DB_USERNAME`, `DB_PASSWORD`) and Gmail SMTP credentials for emails.
3. Run the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```
   *The backend server will start on `http://localhost:9090`.*

### 3. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at `http://localhost:5173`.*

---

## UI / UX Highlights

- **Dynamic Media Attachments**: Uploaded images, videos, and documents render natively inside chat bubbles. Images can be expanded, videos have inline controls, and documents display as neat download cards.
- **Webcam Modal**: Users can securely interact with their device cameras to capture and set profile pictures natively within the app.
- **Dynamic Invite UI**: Group invites are beautifully rendered as actionable buttons inside the chat stream. If an invite expires or is processed, it smoothly transitions into a static status badge.
- **Glassmorphism Toasts**: Custom-built, animated popup notifications alert users of new messages and friend requests without interrupting their workflow.
- **Smooth Animations**: Tailored micro-animations (bouncing success alerts, sliding modals, pulsing loading states) create a premium user experience.

## Security
- Passwords are securely hashed using BCrypt.
- All secure API endpoints are protected via JWT authorization headers.
- **Two-Factor Authentication (2FA)** support for enhanced account security using authenticator apps.
- File uploads are validated and strictly contained within the backend upload directory (max 150MB).

## License
This project is open-source and available under the [MIT License](LICENSE).
