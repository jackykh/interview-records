# Interview Record

A modern web application for tracking job interviews and managing the interview process. Built with React and TypeScript, this application helps you keep track of your job interviews, monitor response times, and manage your job search process effectively.

## Features

- 📝 Record and track job interviews
- ⏰ Track working days since interview
- 📊 View interview statistics and trends
- 📅 Automatic holiday integration (Hong Kong public holidays)
- 📱 Responsive design for all devices

## Technology Stack

### Frontend

- **React** (v19) - Core UI framework
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework for styling

### State Management & Data Handling

- **Zustand** - Lightweight state management
- **TanStack Query** (React Query) - Server state management and caching
- **Dexie.js** - IndexedDB wrapper for client-side storage

### Additional Libraries

- **date-fns** - Modern date utility library
- **react-router-dom** - Client-side routing
- **recharts** - Responsive charting library

## Getting Started

1. Clone the repository:

```bash
git clone [repository-url]
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Usage

1. **Adding an Interview**

   - Click the interview form
   - Enter company name, position, and interview date/time
   - Add optional notes
   - Submit to save

2. **Tracking Interviews**

   - View all interviews in the main list
   - See working days elapsed since each interview
   - Update interview status (Pending/Passed/Failed)
   - Add follow-up rounds for successful interviews

3. **Statistics**
   - View monthly interview statistics
   - Track success rates
   - Monitor response times

## Features in Detail

- **Working Days Calculation**

  - Automatically excludes weekends
  - Integrates Hong Kong public holidays
  - Shows precise timing for recent interviews

- **Batch Operations**
  - Bulk status updates
  - Clear old records

## License

This project is licensed under the MIT License - see the LICENSE file for details.
