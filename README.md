# TaskFlow – Daily Task Manager

A full-stack Daily Task Management application built using React, Node.js, Express.js and MySQL. TaskFlow helps users organize daily activities, track progress and manage pending tasks automatically.

## Features

- Create, update and delete tasks.
- Mark tasks as completed or pending.
- Automatically carry forward pending tasks to the next day.
- Permanently delete completed tasks at midnight.
- Automatic daily reset using IST (Asia/Kolkata).
- Daily task completion statistics.
- Progress percentage and progress bar.
- Filter tasks by All, Active and Completed.
- Responsive dashboard for desktop and mobile.

## Tech Stack

**Frontend**
- React.js
- Vite
- Tailwind CSS
- Axios

**Backend**
- Node.js
- Express.js
- MySQL2
- Node-Cron
- Dotenv
- CORS

**Database**
- MySQL

## Project Structure

```text
sql-todo/
├── client/
│   └── src/
├── server/
│   ├── config/
│   │   └── db.js
│   ├── server.js
│   └── .env
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

## Installation & Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd sql-todo
```

### 2. Setup Database

- Open MySQL Workbench.
- Execute the SQL commands from `database/schema.sql`.
- This creates the `todo_app` database and `todos` table.

### 3. Setup Backend

```bash
cd server
npm install
```

Create a `.env` file inside the server folder:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=todo_app
PORT=5000
```

Start the backend:

```bash
npm run dev
```

### 4. Setup Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Open the application at:

```text
http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/todos` | Fetch today's tasks |
| POST | `/api/todos` | Create a task |
| PUT | `/api/todos/:id` | Update a task |
| DELETE | `/api/todos/:id` | Delete a task |

## Daily Task Management Logic

TaskFlow follows an automatic daily task management system:

- Completed tasks are permanently deleted at 12:00 AM IST.
- Pending tasks automatically move to the next day.
- New tasks can be added at any time.
- Original task creation timestamps are preserved.
- Missed midnight cleanup is recovered when the backend starts or an API request is made.

## Database Structure

Database: `todo_app`

Table: `todos`

| Column | Type | Description |
|---|---|---|
| id | INT | Primary key, auto increment |
| title | VARCHAR(255) | Task title |
| completed | BOOLEAN | Task completion status |
| created_at | TIMESTAMP | Original creation timestamp |
| task_date | DATE | Assigned task date |

## Environment Variables

Never commit your `.env` file or expose database credentials on GitHub.

## Future Improvements

- Cloud database integration.
- Online deployment.
- Enhanced task analytics.
- Improved dashboard experience.

## Author

Developed as a personal full-stack project to practice React, Node.js, Express.js, MySQL and REST API development.