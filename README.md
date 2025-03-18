
# VolunteerConnect 🎉

A modern web application for managing events and attendees built with React, Express, and TypeScript.

![Tech Stack](https://skillicons.dev/icons?i=ts,react,express,tailwind,vite)

![Screenshare-2025-03-184_07_32PM-ezgif com-crop (1)](https://github.com/user-attachments/assets/a601e41d-367e-4a69-97ea-ffb47a31c6b4)


## ✨ Features

- **👤 User Authentication** - Secure login and registration system
- **📅 Event Management** - Create, update, and delete events
- **👥 Attendee Tracking** - Import and manage event attendees
- **📊 Contact Management** - Organize contacts with categories and priorities
- **🔍 Advanced Search** - Filter and find contacts easily
- **📱 Responsive Design** - Works seamlessly on all devices

## 🚀 Quick Start

Clone this Repo & For local development setup:
1. Setup a local postgresql db instance.
2. Update .env file accordingly

```env
DATABASE_URL=<local_postgresql_db>
SESSION_SECRET=<your_session_secret>
```
3. Run
```
npm install
npm run dev
```

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
