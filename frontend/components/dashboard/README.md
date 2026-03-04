# Dashboard Components

This folder contains the dashboard components that provide live data functionality for the HPSI application dashboard.

## Components

### CalendarComponent

Interactive calendar with live consultation session data:

- Shows sessions as colored indicators on dates
- Allows clicking on dates to schedule new sessions
- Clicking on sessions navigates to athlete consultation tabs
- Navigation between months
- Hover effects to add new bookings

### BookingModal

Modal for creating and editing consultation sessions:

- Select athlete, consultation type, date/time, location
- Form validation
- Integrates with backend APIs
- Supports both creating new and editing existing sessions

### SessionCard

Reusable card component for displaying consultation sessions:

- Shows athlete name, date, time, location
- Status indicators (scheduled, in-progress, completed, cancelled)
- Action buttons for edit, view, delete
- Clicking navigates to athlete consultation tab

### DashboardStats

Live statistics display:

- Today's session count and completion
- Active athlete count
- Quick action buttons for common tasks
- Refreshes automatically

### UpcomingSessions

List of upcoming consultation sessions:

- Shows next few sessions in card format
- Sortable and filterable
- Real-time updates
- Direct navigation to athlete profiles

### TodaySchedule

Today's schedule in timeline format:

- Shows user's sessions for the current day
- Time-based color coding
- Status indicators
- Compact timeline view

## API Integration

All components use the `dashboardApi` utility from `/utils/dashboardApi.ts` for backend communication. The API handles:

- Fetching sessions by date range
- Creating and updating consultation sessions
- Getting athletes and consultation types
- Session statistics

## Navigation

Sessions link directly to athlete consultation tabs using the URL pattern:

```
/AMS/athlete-management/${athleteId}?tab=consultation
```

This ensures users can click from any session booking and immediately start the consultation process.

## Usage

```tsx
import {
  CalendarComponent,
  BookingModal,
  SessionCard,
  DashboardStats,
  UpcomingSessions,
  TodaySchedule,
} from "@/components/dashboard";

// Use in dashboard page with proper handlers
```

## Features

- ✅ Live data from backend APIs
- ✅ Interactive calendar with session booking
- ✅ Session management (create, edit, cancel)
- ✅ Direct navigation to athlete consultation tabs
- ✅ Real-time updates and auto-refresh
- ✅ Fallback data when APIs are unavailable
- ✅ Responsive design
- ✅ Loading states and error handling
