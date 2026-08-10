# Full-Stack Real-Time Chat Application

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern, robust, and feature-rich real-time chat application built with **Spring Boot** and **React**. This platform allows users to connect with friends, engage in one-on-one direct messaging, and create dynamic group chats. 

## Key Features

* **Real-Time Messaging**: Lightning-fast messaging powered by WebSockets and STOMP.
* **Direct & Group Chats**: Seamless 1-on-1 conversations and rich group chat capabilities.
* **Smart Group Invitations**: Send, accept, and decline group invitations directly through interactive chat messages.
* **System Event Notifications**: Live chat badges for users joining, leaving, or being removed from groups.
* **Friend System**: Search for users and send/manage friend requests.
* **Message Management**: Edit and delete your sent messages in real-time.
* **Rich Notifications**: In-app popout toasts, audio chimes, and browser desktop notifications.
* **Authentication & Security**: Secure JWT-based authentication, complete with email verification and password recovery.
* **Profile Customization**: Upload profile pictures and update your display name.

## Technology Stack

### Frontend
* **Framework**: React 18 with TypeScript
* **Build Tool**: Vite
* **Styling**: Tailwind CSS & Headless UI
* **Icons**: Heroicons
* **Networking**: Axios & `@stomp/stompjs`
* **Routing**: React Router DOM

### Backend
* **Framework**: Spring Boot 3 (Java 17)
* **Security**: Spring Security & JWT
* **Database**: PostgreSQL & Spring Data JPA
* **Real-Time**: Spring WebSocket
* **Email Servicing**: JavaMailSender

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

- **Dynamic Invite UI**: Group invites are beautifully rendered as actionable buttons inside the chat stream. If an invite expires or is processed, it smoothly transitions into a static status badge.
- **Glassmorphism Toasts**: Custom-built, animated popup notifications alert users of new messages and friend requests without interrupting their workflow.
- **Smooth Animations**: Tailored micro-animations (bouncing success alerts, sliding modals, pulsing loading states) create a premium user experience.

## Security
- Passwords are securely hashed using BCrypt.
- All secure API endpoints are protected via JWT authorization headers.
- File uploads are validated and strictly contained within the backend upload directory.

## License
This project is open-source and available under the [MIT License](LICENSE).
