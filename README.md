# 🎮 ValQuiz — Real-Time Multiplayer Quiz Powered by Valkey

ValQuiz is a real-time multiplayer quiz platform inspired by Kahoot built using React, Node.js, Socket.IO, and Valkey.

Players create rooms, join instantly using room codes, answer questions live, compete on dynamic leaderboards, and experience low-latency gameplay powered by Valkey.

---

## 🚀 Features

✅ Create Quiz Rooms
✅ Join Using Room Codes
✅ Host Dashboard
✅ Real-Time Question Broadcasting
✅ Live Countdown Timer
✅ Instant Score Updates
✅ Dynamic Leaderboard
✅ End Game Results
✅ Session Persistence using Valkey
✅ Responsive Modern UI

---

# 🏗 Architecture

Frontend (React + Vite)

↓

Socket.IO + REST APIs

↓

Backend (Node + Express)

↓

Redis-Compatible Client

↓

Valkey Server

---

# 📂 Project Structure

valquiz/

frontend/

backend/

docker-compose.yml

README.md

.env.example

---

# 🛠 Tech Stack

## Frontend

* React
* Vite
* Tailwind CSS
* Socket.IO Client

## Backend

* Node.js
* Express.js
* Socket.IO

## Database

* Valkey

## AI Tools

* Codex
* ChatGPT

## Deployment

* Docker
* Vercel

## Other Tools

* GitHub
* Postman
* VS Code

---

# 🎯 User Flow

### Host

1. Create Room
2. Share Room Code
3. Start Quiz
4. Monitor Leaderboard

### Players

1. Join Room
2. Answer Questions
3. Track Score
4. View Results

---

# 🔥 Valkey Usage

ValQuiz uses Valkey for:

* Session persistence
* Real-time synchronization
* Quiz room state
* Player score storage
* Leaderboards
* Multiplayer event handling

Example keys:

room:{roomId}

players:{roomId}

scores:{roomId}

questions:{roomId}

---

# ⚡ Installation

Clone:

git clone https://github.com/samad3600/valquiz.git

Move:

cd valquiz

Frontend:

cd frontend

npm install

npm run dev

Backend:

cd ../backend

npm install

npm start

---

# 🐳 Docker

docker compose up --build

Frontend:

http://localhost:5173

Backend:

http://localhost:5000

---

# 📸 Screenshots

Add:

* Home Screen
* Room Creation
* Quiz Screen
* Leaderboard
* Results Screen

---

# 🎥 Demo

Deployed Link:
(Add URL)

Demo Video:
(Add URL)

---

# 👨‍💻 Team

## Team Name

ValQuiz Team

---

### Team Lead

Abdul Samad Yaqoob

Role:
Architecture • Integration • Coordination • Project Management • Final Submission

GitHub:
https://github.com/samad3600

LinkedIn:
https://www.linkedin.com/in/abdul-samad-yaqoob-7bb0372a9/

---

### Team Members

Syed Mohammed Ishaq Hasan

Role:
Backend Development • APIs • Real-Time Systems

LinkedIn:
https://www.linkedin.com/in/syed-mohammed-ishaq-hasan-47a87b254/

---

Soudager Irfan Ahmed

Role:
Frontend Development • UI/UX

LinkedIn:
https://www.linkedin.com/in/soudager-irfan-ahmed-009093357/

---

Syed Ismail Ul Haq

Role:
Testing • Deployment • Integration

LinkedIn:
https://www.linkedin.com/in/syed-ismail-aaa404349/

---

# 🚧 Challenges Faced

* Real-time synchronization
* Multiplayer architecture
* Session persistence
* Valkey integration
* Deployment setup

---

# 📚 Learnings

* Event-driven architecture
* Real-time application design
* Multiplayer synchronization
* Valkey data structures
* Team collaboration

---

# 🌟 Future Improvements

* AI-generated quizzes
* Tournament Mode
* Classroom Analytics
* Mobile Support
* Public Matchmaking

---

# ❤️ Acknowledgements

Built during the Valkey Hackathon.

Special thanks to organizers, mentors, and the open-source community.

Project Leadership:
Abdul Samad Yaqoob
