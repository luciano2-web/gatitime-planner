# Gati School Hub

Create a full-stack web application called "GatiSchool" designed for students to organize their entire school day. The purpose is to help students manage class schedules, links to virtual classes (Zoom, Google Meet, etc.), homework reminders, and alarms in a simple, futuristic, distraction-free interface.

Core Features:
1. Onboarding screen that asks:
   - What time each class starts and ends
   - Subject name
   - Link to join the class
   - Days of the week for each class
2. Dashboard:
   - Shows today's schedule in chronological order
   - Shows countdown timer to next class
   - "Enter Class" button that opens the stored link in a new tab
3. Reminders & Notifications:
   - Browser notifications 5–10 minutes before class
   - Visual alert banner inside the app
4. Calendar View:
   - Monthly and weekly calendar
   - Highlight days with classes
5. Task Manager:
   - Add homework with due dates
   - Mark as completed
6. Data Storage:
   - Use a backend database so schedules persist
   - User authentication (email + password)
7. Design:
   - Futuristic but minimal
   - Dark mode default
   - Clean typography
   - Student-focused, no ads

User Flow:
- User signs up or logs in
- Completes onboarding schedule setup
- Lands on dashboard
- Can edit schedule anytime

Make it responsive for tablet and desktop use. Include authentication, database, and notification support. Ensure it is production-ready.

This is intended as a real usable product, not a mockup.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gatitime-planner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6f9f5734-fafe-4aa6-8cc6-178a567c4fbb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
