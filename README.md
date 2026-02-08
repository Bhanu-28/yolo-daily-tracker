# 🚀 YOLO Daily Tracker

A beautiful, modern task tracker with Kanban board, activity heatmap, and cloud sync via Firebase.

![YOLO Daily Tracker](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **📋 Kanban Board** - Drag-and-drop task management with To Do, In Progress, On Hold, and Done columns
- **📊 Activity Heatmap** - GitHub-style contribution heatmap with year/month filtering
- **☁️ Cloud Sync** - Real-time sync across devices with Firebase (optional)
- **🔐 Google Sign-In** - Secure authentication with your Google account
- **📥 CSV Export** - Export your tasks by day, week, month, or all time
- **📱 Responsive** - Works beautifully on desktop and mobile
- **🌙 Dark Mode** - Elegant dark theme that's easy on the eyes
- **⚡ Offline Support** - Works offline with localStorage fallback

## 🚀 Quick Start

### Option 1: Use Without Firebase (Offline Only)

1. Clone the repository
2. Open `index.html` in your browser
3. Start tracking your tasks!

### Option 2: Use With Firebase (Cloud Sync)

1. Clone the repository
2. Copy `firebase-config.example.js` to `firebase-config.js`
3. Add your Firebase credentials (see [Firebase Setup](#-firebase-setup))
4. Run with a local server: `python3 -m http.server 8080`
5. Open `http://localhost:8080`

## 🔥 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Add a Web App (click the `</>` icon)
4. Copy the config values to `firebase-config.js`

5. **Enable Authentication:**
   - Go to Build → Authentication → Get started
   - Enable Google Sign-In

6. **Create Firestore Database:**
   - Go to Build → Firestore Database
   - Create database in test mode
   - Update rules after testing (see `FIREBASE_SETUP.md`)

## 🌐 Deployment

### Deploy to Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize in project directory
cd task-tracker
firebase init hosting

# Deploy
firebase deploy
```

### Deploy to GitHub Pages

1. Push to GitHub repository
2. Go to Settings → Pages
3. Select "Deploy from a branch" → main → /root
4. Your site will be live at `https://username.github.io/yolo-tracker`

## 📁 Project Structure

```
task-tracker/
├── index.html              # Main HTML file
├── styles.css              # All styles
├── app.js                  # Application logic
├── firebase-config.js      # Your Firebase config (not in git)
├── firebase-config.example.js  # Template for Firebase config
├── .gitignore             # Git ignore file
├── README.md              # This file
└── FIREBASE_SETUP.md      # Detailed Firebase setup guide
```

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication (Google)
- **Styling:** Custom CSS with CSS Variables
- **Font:** Inter (Google Fonts)

## 📝 Usage

### Adding Tasks
1. Click "+ Add Task" button
2. Fill in title, date, hours (optional), and notes
3. Select status and save

### Drag and Drop
- Drag task cards between columns to change status
- Drop on To Do, In Progress, On Hold, or Done

### Filtering
- Use the filter dropdown to view by Day, Week, Month, or All Time
- Select specific dates using the date picker

### Activity Heatmap
- View your productivity patterns over time
- Filter by year and month
- Click on any day to jump to that date's tasks

### Export
- Click Export button
- Choose Current View, Today, This Week, This Month, or All Tasks
- Download as CSV file

## 🔒 Privacy

- When Firebase is enabled, tasks are stored in your personal Firestore collection
- Tasks are tied to your Google account
- No data is shared between users
- Logging out clears the local cache

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 👤 Author

**Bhanu Pradeep** - Software Engineer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/bhanu-pradeep/)

## 🚧 Future Improvements

- [ ] **Weekly Hours Summary** - Track total hours spent on tasks per week
- [ ] **Task Categories/Tags** - Organize tasks with custom labels
- [ ] **Recurring Tasks** - Set up daily/weekly repeating tasks
- [ ] **Dark/Light Theme Toggle** - Switch between themes
- [ ] **Mobile App** - React Native or Flutter version

---

Made with ❤️ and Ease your tasks.
