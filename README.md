# Interview Record

A modern web application for tracking job interviews and managing the interview process. This application helps you keep track of your job interviews, monitor response times, and manage your job search process effectively.

## Features

- 📝 Record and track job interviews
- ⏰ Track working days since interview
- 📊 View interview statistics and trends
- 📅 Automatic holiday integration (Hong Kong public holidays)
- 🔄 Real-time status updates
- 📱 Responsive design for all devices
- 🧮 Smart resignation calculator

## Data Privacy & Security

- All user data is processed and stored locally in your browser's IndexedDB
- No data is sent to any external servers
- No user tracking or analytics
- Complete data privacy and security

## Public Holiday Integration

This application integrates with the Hong Kong Digital Policy Office's Public Holiday API:

- Source: [Hong Kong Public Holidays Open Data](https://data.gov.hk/tc-data/dataset/hk-dpo-statistic-cal)
- API Endpoint: `https://www.1823.gov.hk/common/ical/tc.json`
- Holiday data is cached locally to minimize API calls
- Automatic working day calculations excluding public holidays

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

4. **Resignation Calculator**
   - Calculate optimal resignation dates
   - Smart scoring system based on:
     - Number of working days (primary factor)
     - Consecutive holidays after last working day
   - Features:
     - Interactive calendar for date selection
     - Detailed breakdown of working days
     - Top 10 recommended resignation dates
     - Visual indicators for holidays and weekends

## Features in Detail

- **Working Days Calculation**

  - Automatically excludes weekends
  - Integrates Hong Kong public holidays
  - Shows precise timing for recent interviews

- **Batch Operations**

  - Bulk status updates
  - Clear old records

- **Resignation Planning**
  - Intelligent date scoring system
  - Considers standard notice period
  - Optimizes for minimum working days
  - Highlights dates with holiday advantages
  - Detailed day-by-day breakdown

## License

This project is licensed under the MIT License.
