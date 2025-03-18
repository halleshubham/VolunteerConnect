
# VolunteerConnect 🎉

A modern web application for managing events and attendees built with React, Express, and TypeScript.

![Tech Stack](https://skillicons.dev/icons?i=ts,react,express,tailwind,vite)

## ✨ Features

- **👤 User Authentication** - Secure login and registration system
- **📅 Event Management** - Create, update, and delete events
- **👥 Attendee Tracking** - Import and manage event attendees
- **📊 Contact Management** - Organize contacts with categories and priorities
- **🔍 Advanced Search** - Filter and find contacts easily
- **📱 Responsive Design** - Works seamlessly on all devices

## 🚀 Quick Start

1. Clone this Repl and click the Run button
2. Open the app in your browser
3. Register a new account or login
4. Start managing your events!

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon)
- **Authentication**: Passport.js
- **Forms**: React Hook Form + Zod
- **UI Components**: Radix UI + Shadcn/ui

## 🔐 Environment Variables

The following environment variables are required:

```env
DATABASE_URL=<local_postgresql_db>
SESSION_SECRET=<your_session_secret>
```

## 📋 Data Import

The system supports Excel file imports for attendees with the following columns:
- Name
- Mobile
- Email
- Area
- City
- State
- Nation
- Pincode

## 🤝 Contributing

Feel free to fork this and submit improvements!

## 📝 License

MIT License
