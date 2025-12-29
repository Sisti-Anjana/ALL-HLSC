# Complete Dashboard & Log Issues Documentation

## Table of Contents
1. [Overview](#overview)
2. [Dashboard Page Structure](#dashboard-page-structure)
3. [Portfolio Cards System](#portfolio-cards-system)
4. [Portfolio Locking & Unlocking](#portfolio-locking--unlocking)
5. [Color Status System](#color-status-system)
6. [Coverage Analysis](#coverage-analysis)
7. [Issue Logging Form](#issue-logging-form)
8. [Navigation to Issue Details](#navigation-to-issue-details)
9. [Performance Analytics](#performance-analytics)
10. [Issues by User](#issues-by-user)
11. [Coverage Matrix](#coverage-matrix)
12. [Hover Tooltips & Card Interactions](#hover-tooltips--card-interactions)
13. [Code Snippets](#code-snippets)

---

## Overview

The Dashboard & Log Issues page is the main interface of the Portfolio Issue Tracker application. It provides a comprehensive view of 26 portfolios, real-time status indicators, issue logging capabilities, and detailed analytics. The page is designed for multi-user collaboration with real-time synchronization and portfolio locking mechanisms.

---

## Dashboard Page Structure

### Main Components

The dashboard consists of three main sections:

1. **Quick Portfolio Reference** (Top Section)
   - 26 Portfolio Cards displayed in a responsive grid
   - Real-time status indicators
   - Search functionality
   - "+ Log New Issue" button

2. **Hourly Coverage Analysis** (Middle Section)
   - Interactive bar chart showing coverage by hour (0-23)
   - Date range filters (Today, Week, Month, Custom)
   - Color-coded bars based on coverage percentage

3. **Issue Logging Form** (Bottom Section)
   - Complete form for logging new issues
   - Table displaying all logged issues
   - Search and filter capabilities
   - Export functionality

### Header Section

The header displays:
- Company logo (with fallback)
- Application title: "Standard Solar Issue Tracker"
- User information (Admin/User badge)
- Admin Panel button (admin only)
- Logout button
- Current Hour display (updates every minute)

### Tab Navigation

Five main tabs:
- **Dashboard & Log Issues** (default)
- **Issue Details**
- **Performance Analytics** (admin only)
- **Issues by User**
- **Coverage Matrix** (admin only)

---

## Portfolio Cards System

### Card Layout

Each portfolio card displays:
- **Portfolio Name** (e.g., "Aurora", "BESS & Trimark")
- **Subtitle** (e.g., "Aurora", "Multi Das")
- **Status Badge** (color-coded based on activity)
- **Last Activity Hour Indicator** (top-right corner)
  - Format: "H [hour]" for today's activity
  - Format: "Y [hour]" for yesterday's activity
  - Shows "-" if no activity recorded

### Card Grid Layout

- **Responsive Grid**: 3 columns (mobile) → 4 columns (tablet) → 5 columns (desktop) → 7 columns (large screens)
- **Gap**: 1.5 spacing units between cards
- **Overflow**: Visible to allow tooltips to display properly

### Portfolio List (26 Portfolios)

1. Aurora
2. BESS & Trimark
3. Chint
4. eG/GByte/PD/GPM
5. Guarantee Sites
6. Intermountain West
7. KK
8. Locus
9. Main Portfolio
10. Mid Atlantic 1
11. Mid Atlantic 2
12. Midwest 1
13. Midwest 2
14. New England 1
15. New England 2
16. New England 3
17. Nor Cal 1
18. Nor Cal 2
19. PLF
20. Power Factor
21. Secondary Portfolio
22. So Cal 1
23. So Cal 2
24. So Cal 3
25. SolarEdge
26. SolrenView

---

## Portfolio Locking & Unlocking

### How Portfolios Are Locked

**Automatic Locking:**
When a user selects a portfolio, hour, and monitored_by in the issue logging form, the system automatically creates a reservation (lock) in the `hour_reservations` table.

**Lock Creation Process:**
1. User selects Portfolio from dropdown
2. User selects Hour (0-23)
3. User selects "Monitored By" (auto-filled with logged-in user)
4. System checks for existing locks on that portfolio/hour combination
5. If no conflict, creates a lock with:
   - `portfolio_id`: The selected portfolio's ID
   - `issue_hour`: The selected hour
   - `monitored_by`: The user's name
   - `session_id`: Unique session identifier
   - `expires_at`: Current time + 1 hour

**Lock Restrictions:**
- One user can only lock ONE portfolio at a time
- User must complete current portfolio (mark "All Sites Checked" = Yes) before locking another
- Locks are hour-specific (only valid for the current hour)
- Locks automatically expire when the hour changes
- Admin users can override existing locks

### Visual Lock Indicators

**Locked Portfolio Card:**
- **Purple Border**: Thick 6px purple border (`border-purple-600`)
- **Background**: Maintains status color (green/red/yellow/etc.)
- **Lock Icon**: Shows in modal when portfolio is locked
- **Lock Message**: "🔒 Locked by [User Name]" displayed in modal

**Code Reference:**
```2104:2111:client/src/components/SinglePageComplete.js
                  // PRIORITY 1: If locked, ALWAYS show PURPLE BORDER (thick) - regardless of green status
                  // CRITICAL: Lock status takes priority - purple border should always show when locked
                  if (reservation) {
                    cardBorder = 'border-[6px] border-purple-600 !border-purple-600';
                    console.log(`🔒 Showing purple border for locked portfolio: ${portfolio.name}`, {
                      reservation,
                      isGreenStatus,
                      sitesConfirmed
                    });
                  }
```

### How Portfolios Are Unlocked

**Automatic Unlocking:**
1. **Hour Change**: All locks for previous hour are automatically released when hour changes
2. **Completion**: When user marks "All Sites Checked" = Yes, the lock is released
3. **Manual Unlock**: User can manually unlock from the action modal

**Manual Unlock Process:**
1. Click on portfolio card
2. Modal opens showing portfolio options
3. Click "Unlock Portfolio" button (only visible if user owns the lock)
4. System releases the lock for current user's session
5. Other users can now lock and log issues for that portfolio/hour

**Code Reference:**
```1650:1690:client/src/components/SinglePageComplete.js
  const handleUnlockCurrentPortfolio = async () => {
    if (!selectedPortfolioForAction) return;
    const record = portfolios.find((p) => p.name === selectedPortfolioForAction);
    const portfolioId = record?.portfolio_id || record?.id;
    if (!portfolioId) {
      alert('❌ ERROR: Unable to determine portfolio ID to unlock.');
      return;
    }

    try {
      setUpdatingSitesCheckPortfolio(selectedPortfolioForAction);
      // Save sites checked details as "No" (not fully completed) if any text is provided
      const reasonText = sitesCheckedText?.trim();
      if (reasonText) {
        await updatePortfolioSitesChecked(selectedPortfolioForAction, false);
      }

      // Release lock for this portfolio/hour ONLY for the current user's session
      await releaseReservationForPortfolio(portfolioId, currentHour, false);

      // Refresh reservations and data to update UI
      await fetchActiveReservations();
      await fetchDataBackground();

      alert(`✅ Portfolio \"${selectedPortfolioForAction}\" has been unlocked. Other users can now lock and log issues for this hour.`);

      // Close modal and reset state similar to close button
      setShowActionModal(false);
      setSelectedPortfolioForAction(null);
      setSitesCheckError(null);
      setSitesCheckedText('');
      setShowSitesCheckedInput(false);
      setIsPortfolioLockedByOther(false);
      setPortfolioLockedBy(null);
    } catch (error) {
      console.error('❌ Error unlocking portfolio from action modal:', error);
      alert('❌ Error unlocking portfolio. Please try again.');
    } finally {
      setUpdatingSitesCheckPortfolio(null);
    }
  };
```

### Lock Validation

**Before Logging Issues:**
- System checks if portfolio is locked by current user
- If locked by someone else, user cannot log issues
- If not locked, user can proceed to log issues

**Before Editing Issues:**
- Only the person who logged the issue can edit it
- Portfolio must be locked by the same user
- System validates both `monitored_by` and `session_id`

---

## Color Status System

### Status Colors & Meanings

The portfolio cards change color based on the time since last activity:

1. **🟢 Green (`bg-green-100 border-green-300`)**
   - **Status**: "Updated (<1h)"
   - **Condition**: Portfolio has been updated within the last hour
   - **Requirement**: "All Sites Checked" = Yes AND issue logged in current hour

2. **🔵 Blue (`bg-blue-100 border-blue-300`)**
   - **Status**: "1h Inactive"
   - **Condition**: Last activity was 1 hour ago
   - **Hours Difference**: Exactly 1 hour

3. **🟡 Yellow (`bg-yellow-200 border-yellow-400`)**
   - **Status**: "2h Inactive"
   - **Condition**: Last activity was 2 hours ago
   - **Hours Difference**: Exactly 2 hours

4. **🟠 Orange (`bg-orange-200 border-orange-400`)**
   - **Status**: "3h Inactive"
   - **Condition**: Last activity was 3 hours ago
   - **Hours Difference**: Exactly 3 hours

5. **🔴 Red (`bg-red-100 border-red-300`)**
   - **Status**: "No Activity (4h+)"
   - **Condition**: No activity for 4+ hours OR no issues logged today
   - **Hours Difference**: 4+ hours or negative (from previous day)

### Color Calculation Logic

**Code Reference:**
```1318:1406:client/src/components/SinglePageComplete.js
  // Get portfolio status for dashboard cards
  const getPortfolioStatus = (portfolioName) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const portfolioIssues = issues.filter(issue => {
      const issueDate = new Date(issue.created_at);
      issueDate.setHours(0, 0, 0, 0);
      return issue.portfolio_name === portfolioName && 
             issueDate.getTime() === today.getTime();
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const sitesConfirmed = isPortfolioSitesChecked(portfolioName);
    const record = findPortfolioRecord(portfolioName);
    const checkedHour = record?.all_sites_checked_hour ? normalizeCheckedHour(record.all_sites_checked_hour) : null;

    if (portfolioIssues.length === 0) {
      return { 
        status: 'No Activity (4h+)', 
        color: 'bg-red-100 border-red-300', 
        textColor: 'text-red-800' 
      };
    }

    // Find the most recent issue
    const latestIssue = portfolioIssues[0];
    const hoursDiff = currentHour - latestIssue.issue_hour;

    if (!sitesConfirmed) {
      return { 
        status: 'Awaiting sites confirmation', 
        color: 'bg-yellow-100 border-yellow-300', 
        textColor: 'text-yellow-800' 
      };
    }

    // CRITICAL FIX: If sites are confirmed, check if it's still the same hour
    // If checked in current hour, ALWAYS show green until next hour
    // This ensures once "All Sites Checked" = Yes is clicked, it stays green for the entire hour
    if (sitesConfirmed && checkedHour !== null && checkedHour === currentHour) {
      // Portfolio was checked in current hour - stay green for entire hour
      return { 
        status: 'Updated (<1h)', 
        color: 'bg-green-100 border-green-300', 
        textColor: 'text-green-800' 
      };
    }

    // Handle negative hoursDiff (e.g., issue logged at hour 23, current hour is 0)
    // In this case, treat as if it's from previous day, so it's 4h+
    if (hoursDiff < 0 || hoursDiff >= 4) {
      return { 
        status: 'No Activity (4h+)', 
        color: 'bg-red-100 border-red-300', 
        textColor: 'text-red-800' 
      };
    } else if (hoursDiff < 1) {
      return { 
        status: 'Updated (<1h)', 
        color: 'bg-green-100 border-green-300', 
        textColor: 'text-green-800' 
      };
    } else if (hoursDiff === 1) {
      return { 
        status: '1h Inactive', 
        color: 'bg-blue-100 border-blue-300', 
        textColor: 'text-blue-800' 
      };
    } else if (hoursDiff === 2) {
      return { 
        status: '2h Inactive', 
        color: 'bg-yellow-200 border-yellow-400', 
        textColor: 'text-yellow-900' 
      };
    } else if (hoursDiff === 3) {
      return { 
        status: '3h Inactive', 
        color: 'bg-orange-200 border-orange-400', 
        textColor: 'text-orange-900' 
      };
    } else {
      // Fallback for any other case (shouldn't happen, but just in case)
      return { 
        status: 'No Activity (4h+)', 
        color: 'bg-red-100 border-red-300', 
        textColor: 'text-red-800' 
      };
    }
  };
```

### Color Legend

The dashboard displays a color legend showing all status types:

```
🟢 Updated (<1h)  |  🔵 1h  |  🟡 2h  |  🟠 3h  |  🔴 No Activity (4h+)
```

---

## Coverage Analysis

### Hourly Coverage Chart

**Location**: Middle section of dashboard, below portfolio cards

**Purpose**: Visual representation of portfolio risk distribution across 24 hours

**Chart Type**: Bar Chart (using Recharts library)

**X-Axis**: Hours (0:00 to 23:00)
**Y-Axis**: Coverage Percentage (0% to 100%)

### Coverage Calculation

**Formula:**
```
Coverage % = (Unique Portfolios Checked in Hour / Total Portfolios) × 100
```

**Code Reference:**
```62:78:client/src/components/HourlyCoverageChart.js
    // Calculate coverage by hour
    const totalPortfolios = portfolios.length || 1; // Use actual portfolio count, avoid division by zero
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourIssues = filteredIssues.filter(issue => issue.issue_hour === hour);
      const uniquePortfolios = new Set(hourIssues.map(issue => issue.portfolio_name));
      const coverage = (uniquePortfolios.size / totalPortfolios) * 100;
      
      return {
        hour: `${hour}:00`,
        coverage: Math.round(coverage * 10) / 10,
        portfoliosChecked: uniquePortfolios.size,
        totalIssues: hourIssues.length
      };
    });

    return hourlyData;
```

### Bar Colors

Bars are color-coded based on coverage percentage:

- **🔴 Red (`#ef4444`)**: 0% coverage (no portfolios checked)
- **🟠 Orange (`#f59e0b`)**: < 50% coverage (low coverage)
- **🟢 Green (`#76AB3F`)**: ≥ 50% coverage (good coverage)

**Code Reference:**
```209:216:client/src/components/HourlyCoverageChart.js
            <Bar dataKey="coverage" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.coverage === 0 ? '#ef4444' : entry.coverage < 50 ? '#f59e0b' : '#76AB3F'}
                />
              ))}
            </Bar>
```

### Date Range Filters

**Available Filters:**
1. **Today**: Shows only today's issues
2. **Week**: Shows last 7 days including today
3. **Month**: Shows last 30 days
4. **Custom**: User selects start and end dates

**Code Reference:**
```25:60:client/src/components/HourlyCoverageChart.js
  const chartData = useMemo(() => {
    // Filter issues based on date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filteredIssues = issues;
    
    if (dateRange === 'today') {
      filteredIssues = issues.filter(issue => {
        const issueDate = new Date(issue.created_at);
        issueDate.setHours(0, 0, 0, 0);
        return issueDate.getTime() === today.getTime();
      });
    } else if (dateRange === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredIssues = issues.filter(issue => {
        const issueDate = new Date(issue.created_at);
        return issueDate >= weekAgo;
      });
    } else if (dateRange === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filteredIssues = issues.filter(issue => {
        const issueDate = new Date(issue.created_at);
        return issueDate >= monthAgo;
      });
    } else if (dateRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredIssues = issues.filter(issue => {
        const issueDate = new Date(issue.created_at);
        return issueDate >= start && issueDate <= end;
      });
    }
```

### Tooltip Information

When hovering over a bar, tooltip displays:
- **Hour**: e.g., "14:00"
- **Coverage**: Percentage (e.g., "Coverage: 65.5%")
- **Portfolios**: Count checked vs total (e.g., "Portfolios: 17/26")
- **Total Count**: Total issues logged in that hour

**Code Reference:**
```81:94:client/src/components/HourlyCoverageChart.js
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded border">
          <p className="font-semibold">{data.hour}</p>
          <p className="text-green-600">Coverage: {data.coverage}%</p>
          <p className="text-sm text-gray-600">Portfolios: {data.portfoliosChecked}/{totalPortfolios}</p>
          <p className="text-sm text-gray-600">Total Count: {data.totalIssues}</p>
        </div>
      );
    }
    return null;
  };
```

---

## Issue Logging Form

### Form Location

The form is located below the Hourly Coverage Analysis chart, identified by `id="issue-log-form"`.

### Form Fields

**1. Portfolio Dropdown** (Required)
- Lists all 26 portfolios
- Pre-selected when clicking portfolio card
- Shows green highlight when selected

**2. Hour Input** (Required)
- Number input (0-23)
- Defaults to current hour
- Disabled when portfolio is locked (locked to reservation hour)

**3. Site Dropdown** (Optional)
- Filtered by selected portfolio
- Shows sites associated with the portfolio

**4. Issue Present** (Required)
- Radio buttons: "Yes" or "No"
- Colored badges:
  - Red badge for "Yes"
  - Green badge for "No"
- When "No" is selected:
  - Issue Details auto-fills with "No issue"
  - Issues Missed By field is disabled

**5. Issue Details** (Conditional)
- Text input field
- Enabled only when "Issue Present" = "Yes"
- Required when "Yes" is selected
- Placeholder: "Select issue present first"

**6. Case Number** (Optional)
- Text input
- Free-form entry

**7. Monitored By** (Required)
- Dropdown with all monitored personnel
- Auto-filled with logged-in user
- Shows green background with "Locked" badge
- Cannot be changed (locked to current user)

**8. Date/Time** (Auto-filled)
- Displays current date/time
- Format: MM/DD/YYYY, HH:MM (24-hour format)
- Read-only

**9. Issues Missed By** (Conditional)
- Dropdown with monitored personnel
- Disabled when "Issue Present" = "No"
- Only enabled when "Issue Present" = "Yes"

**10. Log Ticket Button**
- Green button
- Submits the form
- Validates all required fields before submission

### Form Validation

**Validation Rules:**
1. Portfolio must be selected
2. Issue Present must be "Yes" or "No"
3. Monitored By is required
4. If Issue Present = "Yes", Issue Details is required

**Code Reference:**
```746:838:client/src/components/TicketLoggingTable.js
  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);
    
    // VALIDATION STEP 1: Portfolio
    if (!formData.portfolio_id || formData.portfolio_id === '') {
      alert('ERROR: Please select a Portfolio');
      return;
    }

    // Removed lock validation - issues can now be saved regardless of lock status
    const parsedHour = parseInt(formData.issue_hour, 10);

    // VALIDATION STEP 2: Issue Present (CRITICAL!)
    const issuePresent = String(formData.issue_present).trim();
    if (!issuePresent || issuePresent === '') {
      alert('❌ ERROR: Please select "Yes" or "No" for Issue Present');
      return;
    }
    
    if (issuePresent !== 'Yes' && issuePresent !== 'No') {
      alert(`❌ ERROR: Invalid Issue Present value. Must be "Yes" or "No"`);
      return;
    }
    // VALIDATION STEP 3: Monitored By (MANDATORY!)
    if (!formData.monitored_by || formData.monitored_by.trim() === '') {
      alert('❌ ERROR: Monitored By is REQUIRED. Please select who monitored this hour.');
      return;
    }

    // VALIDATION STEP 4: Issue Details (when yes)
    if (issuePresent === 'Yes' && (!formData.issue_details || formData.issue_details.trim() === '')) {
      alert('❌ ERROR: Please provide issue details when issue is present');
      return;
    }

    try {
      // BUILD DATA OBJECT - ENSURE CLEAN STRING VALUES
      const dataToInsert = {
        portfolio_id: formData.portfolio_id,
        site_id: formData.site_id && formData.site_id !== '' ? formData.site_id : null,
        issue_hour: parseInt(formData.issue_hour, 10),
        issue_present: issuePresent, // GUARANTEED to be 'Yes' or 'No'
        issue_details: formData.issue_details && formData.issue_details.trim() !== '' 
          ? formData.issue_details.trim() 
          : (issuePresent === 'No' ? 'No issue' : null),
        case_number: formData.case_number && formData.case_number.trim() !== '' ? formData.case_number.trim() : null,
        monitored_by: formData.monitored_by && formData.monitored_by !== '' ? formData.monitored_by : null,
        issues_missed_by: formData.issues_missed_by && formData.issues_missed_by !== '' ? formData.issues_missed_by : null,
        entered_by: formData.entered_by || 'System'
      };

      const { data, error } = await supabase
        .from('issues')
        .insert([dataToInsert])
        .select();

      if (error) {
        console.error('Database error:', error.message);
        throw error;
      }

      
      // IMPORTANT: Do NOT release lock after logging issue
      // User should be able to log multiple issues with a single lock
      // Lock will only be released when:
      // 1. User marks "All Sites Checked" = Yes
      // 2. Hour changes (automatic)
      // 3. Admin manually removes lock
      
      setSubmitSuccess('Issue logged successfully!');
      
      // Get logged-in user to preserve after reset
      // Reset form but preserve monitored_by
      setFormData({
        portfolio_id: '',
        site_id: '',
        issue_hour: currentHour,
        issue_present: '',
        issue_details: '',
        case_number: '',
        monitored_by: loggedInUser, // Keep logged-in user selected
        issues_missed_by: '',
        entered_by: 'System'
      });
      
      // Refresh data to ensure all users see the new issue
      onRefresh();
    } catch (error) {
      console.error('Error logging issue:', error.message);
      setSubmitError(error.message || 'Unable to log issue. Please try again.');
    }
  };
```

### Form Behavior

**Auto-population:**
- When clicking a portfolio card and selecting "Log New Issue", the portfolio is pre-selected
- The form scrolls into view smoothly
- Portfolio field highlights briefly with green ring

**Lock Integration:**
- When portfolio is locked, hour field is disabled
- Lock status message appears above form
- Shows which portfolio is locked and by whom

**Success/Error Messages:**
- Success: Green banner "Issue logged successfully!"
- Error: Red banner with error message
- Messages auto-dismiss after 5 seconds

### Issues Table

**Columns:**
1. Portfolio
2. Hour
3. Issue Present (badge: Yes/No)
4. Issue Description
5. Case #
6. Monitored By
7. Date/Time
8. Missed Alerts By
9. Actions (Edit button, Delete for admin)

**Filters:**
- **Search Bar**: Searches portfolio name, issue details, case number, monitored by
- **Date Filter**: Date picker (defaults to today)
- **Hour Filter**: Dropdown (All Hours or specific hour 0-23)
- **Issue Filter**: 
  - "Active Issues (Default)": Shows only issues with Issue Present = Yes
  - "All Issues": Shows all issues

**Export Functionality:**
- **Export All Issues**: Exports all issues in selected date range to CSV
- **Export Active Issues**: Exports only issues with Issue Present = Yes
- Date range selectors for export (From Date, To Date)
- Quick range buttons: Today, This Week, This Month

---

## Navigation to Issue Details

### How to Navigate

**Method 1: From Portfolio Card**
1. Click on any portfolio card
2. Modal opens with options
3. Click "View Issues" button
4. Navigates to Issue Details tab
5. Portfolio is pre-selected in Issue Details view

**Method 2: Direct Tab Click**
1. Click "Issue Details" tab in navigation
2. Opens Issue Details view
3. Can filter by portfolio and hour

**Code Reference:**
```1583:1593:client/src/components/SinglePageComplete.js
  const handleViewIssues = () => {
    const targetName = selectedPortfolioForAction;
    setShowActionModal(false);

    // If we can resolve portfolio id, pass it so Issue Details can default to that portfolio
    const record = portfolios.find((p) => p.name === targetName);
    const pid = record?.portfolio_id || record?.id || '';
    setIssueDetailsInitialPortfolioId(pid || '');
    setActiveTab('issueDetails');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
```

### Issue Details View Features

- Filter by Portfolio (dropdown)
- Filter by Hour (0-23)
- Filter by Date
- Shows all issues matching filters
- Edit and Delete functionality
- Real-time updates

---

## Performance Analytics

### Overview

The Performance Analytics tab provides comprehensive insights into monitoring coverage, user performance, and system-wide statistics.

### Main Metrics Display

**1. Overall Coverage**
- Percentage of portfolios checked out of total (26)
- Displayed as: "X%"
- Color: Green accent

**2. Portfolios Checked**
- Count of unique portfolios that have been checked
- Displayed as: Number

**3. Monitoring Active Hours**
- Number of hours (out of 24) with monitoring activity
- Displayed as: "X/24"

**4. Issues Logged**
- Total count of issues logged in selected period
- Displayed as: Number

**Code Reference:**
```399:404:client/src/components/PerformanceAnalytics.js
      <div className="grid grid-cols-4 gap-3 max-w-3xl">
        <MetricCard label="Overall Coverage" value={`${Math.round(analytics.overallCoverage)}%`} accent="text-green-600" highlight="bg-gradient-to-r from-emerald-50 to-green-100" />
        <MetricCard label="Portfolios Checked" value={analytics.portfoliosChecked} highlight="bg-gradient-to-r from-blue-50 to-sky-100" />
        <MetricCard label="Monitoring Active Hours" value={`${analytics.activeHours}/24`} highlight="bg-gradient-to-r from-amber-50 to-orange-100" />
        <MetricCard label="Issues Logged" value={analytics.totalIssuesLogged} highlight="bg-gradient-to-r from-purple-50 to-indigo-100" />
      </div>
```

### Performance Score

**Circular Gauge:**
- Score range: 0-10
- Calculated from average hourly coverage
- Formula: `(Average Hourly Coverage / 10) rounded`

**Performance Labels:**
- **Excellent** (8-10): Green
- **Good** (5-7): Lime
- **Fair** (3-4): Yellow
- **Needs Improvement** (0-2): Red

**Code Reference:**
```284:291:client/src/components/PerformanceAnalytics.js
  const getPerformanceLabel = (score) => {
    if (score >= 8) return { text: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    if (score >= 5) return { text: 'Good', color: 'text-lime-600', bgColor: 'bg-lime-50', borderColor: 'border-lime-200' };
    if (score >= 3) return { text: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    return { text: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
  };

  const performanceLabel = getPerformanceLabel(analytics.performanceScore);
```

### Coverage Statistics

**Peak Coverage Hour:**
- Hour with highest coverage percentage
- Displayed in green

**Lowest Coverage Hour:**
- Hour with lowest coverage percentage
- Displayed in red

**Hours with 100% Coverage:**
- Count of hours achieving full coverage
- Displayed as: "X/24"

**Code Reference:**
```113:122:client/src/components/PerformanceAnalytics.js
    // Find peak and lowest coverage hours
    const peakHour = hourlyCoverage.reduce((max, current) => 
      current.coverage > max.coverage ? current : max
    );
    const lowestHour = hourlyCoverage.reduce((min, current) => 
      current.coverage < min.coverage ? current : min
    );

    // Calculate hours with 100% coverage
    const fullCoverageHours = hourlyCoverage.filter(h => h.coverage === 100).length;
```

### Date Range Filters

**Available Ranges:**
- **Today**: Current day's data
- **Yesterday**: Previous day's data
- **Last 7 days**: Last week including today
- **Custom Range**: User selects start and end dates

### Team Performance Table

**Columns:**
1. User (with avatar circle)
2. Total Count (issues logged)
3. Total Portfolios Monitored (portfolio visits)
4. Monitoring Active Hours (unique hours worked)
5. Missed Alerts (count)

**Features:**
- Sortable by any column
- Color-coded badges for metrics
- Hover effects (green highlight)
- Export to CSV functionality
- Click user to see detailed breakdown

**Code Reference:**
```560:620:client/src/components/PerformanceAnalytics.js
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 tracking-wider border-b border-gray-200">User</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 tracking-wider border-b border-gray-200">Total Count</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 tracking-wider border-b border-gray-200">Total Portfolios Monitored</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 tracking-wider border-b border-gray-200">Monitoring Active Hours</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 tracking-wider border-b border-gray-200">Missed Alerts</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {analytics.perUserStats.map((u, idx) => (
                    <tr 
                      key={u.user} 
                      className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      style={{ '--hover-color': 'rgba(118, 171, 63, 0.1)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(118, 171, 63, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : 'rgba(0, 0, 0, 0.02)'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ backgroundColor: '#76AB3F' }}>
                            {(u.displayName || u.user || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{u.displayName || u.user}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-gray-900">{u.issues}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                          {u.portfoliosCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                          {u.hoursCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          (u.missedAlerts || 0) === 0 
                            ? 'text-white' 
                            : (u.missedAlerts || 0) <= 3 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                        style={(u.missedAlerts || 0) === 0 ? { backgroundColor: '#76AB3F' } : {}}
                        >
                          {u.missedAlerts || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
```

### Leaderboards

**Three Leaderboard Sections:**

1. **Most Total Portfolios Monitored**
   - Top 7 users by portfolio coverage
   - Clickable to see details

2. **Most Active Issues**
   - Top 7 users by issues found (Issue Present = Yes)
   - Clickable to see details

3. **Most Monitoring Active Hours**
   - Top 7 users by unique hours worked
   - Clickable to see details

**Code Reference:**
```259:281:client/src/components/PerformanceAnalytics.js
    // Leaderboards
    const byIssuesYes = [...perUserStats].sort((a, b) => b.issuesYes - a.issuesYes || b.issues - a.issues);
    const byCoverage = [...perUserStats].sort((a, b) => b.portfoliosCount - a.portfoliosCount || b.issues - a.issues);
    const byHours = [...perUserStats].sort((a, b) => b.hoursCount - a.hoursCount || b.issues - a.issues);

    return {
      peakHour,
      lowestHour,
      fullCoverageHours,
      overallCoverage,
      performanceScore,
      portfoliosChecked: uniquePortfoliosToday.size,
      totalPortfolios,
      totalIssuesLogged,
      activeHours,
      coverageConsistency: hoursWithGoodCoverage,
      perUserStats,
      leaderboard: {
        issuesYes: byIssuesYes.slice(0, 7),
        coverage: byCoverage.slice(0, 7),
        hours: byHours.slice(0, 7)
      }
    };
```

---

## Issues by User

### Overview

The Issues by User tab provides detailed analytics and filtering for issues grouped by monitoring personnel.

### User Performance Analytics Section

**Search Functionality:**
- Search box to find users by name
- Real-time filtering as you type
- Shows count of matching users

**Period Filters:**
- **All Time**: Shows all historical data
- **By Month**: Select specific month
- **By Quarter**: Select Q1-Q4 and year
- **Custom Period**: Select start and end dates
- **Filter by User**: Optional individual user filter

**User Analytics Cards:**

When a user is searched, detailed card displays:

1. **User Header**
   - Avatar circle with first letter
   - User name
   - Performance badge (Excellent/Good/Fair/Low)
   - Monitoring Active Hours count

2. **Quick Stats Row** (5 metrics)
   - **Issues Found**: Count of issues with Issue Present = Yes
   - **Missed**: Count of issues missed by this user
   - **Today's Activity**: Issues logged today
   - **Portfolios Checked**: Total portfolio visits
   - **Accuracy Rate**: Percentage calculation

3. **24-Hour Monitoring Activity Chart**
   - Grid of 24 hours (0-23)
   - Color-coded by activity level:
     - **Green-500**: High activity (5+ checks)
     - **Green-400**: Medium activity (3-4 checks)
     - **Green-300**: Low activity (1-2 checks)
     - **Gray-100**: No activity
   - Red dot indicator for hours with issues found
   - Shows count in each hour cell

**Code Reference:**
```375:433:client/src/components/IssuesByUser.js
        {/* Hourly Breakdown Chart */}
        <div>
          <h5 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            24-Hour Monitoring Activity
          </h5>
          <div className="grid grid-cols-12 gap-1">
            {user.hourlyBreakdown.map((hourData) => (
              <div key={hourData.hour} className="text-center">
                <div
                  className={`h-12 rounded-md transition-all cursor-pointer hover:opacity-80 ${
                    hourData.count === 0
                      ? 'bg-gray-100'
                      : hourData.count >= 5
                      ? 'bg-green-500'
                      : hourData.count >= 3
                      ? 'bg-green-400'
                      : hourData.count >= 1
                      ? 'bg-green-300'
                      : 'bg-gray-100'
                  }`}
                  title={`Hour ${hourData.hour}: ${hourData.count} checks${hourData.foundIssues > 0 ? `, ${hourData.foundIssues} issues found` : ''}`}
                >
                  {hourData.count > 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-white text-xs font-bold">
                      <div>{hourData.count}</div>
                      {hourData.foundIssues > 0 && <div className="text-[10px] mt-0.5 text-white/90">●</div>}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 font-medium mt-1">{hourData.hour}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-gray-600">High Activity (5+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-400"></div>
              <span className="text-gray-600">Medium (3-4)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-300"></div>
              <span className="text-gray-600">Low (1-2)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
              <span className="text-gray-600">No Activity</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Issues Found</span>
            </div>
          </div>
        </div>
```

### Filter & Search Issues Section

**Global Search:**
- Searches portfolio name, issue details, case number
- Real-time filtering
- Shows count of matching issues

**Issue Filter:**
- **Active Issues (Default)**: Shows only Issue Present = Yes
- **All Issues**: Shows all issues

**Checkbox Filters:**
- **Show Missed Alerts Only**: Filters to show only issues with "Issues Missed By" populated

**User Filters:**
- **Search By "Missed By" Name**: Text input
- **Search By "Monitored By" Name**: Text input

**Date Range Filters:**
- **From Date**: Date picker
- **To Date**: Date picker
- **Quick Buttons**: Today, Yesterday, Last 7 Days, Last 30 Days, This Month

**Action Buttons:**
- **Clear Filters**: Resets all filters
- **Export to CSV**: Exports filtered issues to CSV file
- **Result Count**: Shows "X of Y issues"

### Issues Table

**Columns:**
1. **Date & Time**: Formatted timestamp
2. **Portfolio**: Portfolio name
3. **Status**: Badge (Issue/No Issue)
4. **Missed By**: Orange badge if populated
5. **Monitored By**: User name
6. **Details**: Issue description + Case number if available
7. **Actions**: Edit button (green), Delete button (red, admin only)

**Table Features:**
- Hover effects (gray background)
- Sortable columns
- Responsive design
- Empty state message when no results

---

## Coverage Matrix

### Overview

The Coverage Matrix (admin only) provides a comprehensive grid view showing portfolio coverage by user and hour.

### Matrix Structure

**Rows**: Users (monitoring personnel)
**Columns**: Hours (0-23)
**Cells**: Count of portfolios monitored by that user in that hour

### Matrix Features

**User Search:**
- Search box to filter users by name
- Real-time filtering

**Hour Filter:**
- Dropdown to filter by specific hour
- "All Hours" option shows complete 24-hour view

**Issue Filter:**
- **All Issues (Coverage)**: Shows all issues (default)
- **Active Issues Only**: Shows only Issue Present = Yes

**Date Range Filters:**
- **Quick Range Buttons**: Today, Yesterday, Week, Month
- **Custom Date Range**: From Date and To Date pickers
- **Reset All Filters**: Clears all filters

### Cell Color Coding

Cells are color-coded based on coverage count relative to maximum:

- **Green-600** (Dark Green): ≥80% of max (high coverage)
- **Green-500**: ≥60% of max
- **Green-400**: ≥40% of max
- **Green-200**: ≥20% of max
- **Green-100**: <20% of max (low coverage)
- **Gray-50**: No coverage (0)

**Code Reference:**
```4:24:client/src/components/PortfolioMonitoringMatrix.js
const getCellToneClass = (count, max) => {
  if (!count || max === 0) {
    return 'bg-gray-50 border border-gray-100 text-gray-400';
  }

  const ratio = count / max;

  if (ratio >= 0.8) {
    return 'bg-green-600 text-white';
  }
  if (ratio >= 0.6) {
    return 'bg-green-500 text-white';
  }
  if (ratio >= 0.4) {
    return 'bg-green-400 text-white';
  }
  if (ratio >= 0.2) {
    return 'bg-green-200 text-green-900';
  }
  return 'bg-green-100 text-green-800';
};
```

### Hover Tooltip on Cells

When hovering over a cell, tooltip displays:

1. **Header**: User Name - Hour XX:00

2. **Total Count (All Issues)**: Total number of issues logged (Yes + No)

3. **Total Portfolios Monitored**: Count with list of portfolio names
   - Shows each portfolio instance with case number if available
   - Format: "• Portfolio Name (Case: XXX)"

4. **Active Issues**: List of issues with Issue Present = Yes
   - Portfolio name
   - Issue details
   - Case number
   - Date/time

**Code Reference:**
```1356:1436:client/src/components/PortfolioMonitoringMatrix.js
                          {/* Hover Tooltip */}
                          {isHovered && (cellInfo.portfolios.length > 0 || cellInfo.issuesYes.length > 0) && hoveredCell?.position && (
                            <div 
                              className="fixed z-[9999] w-80 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-4 pointer-events-none"
                              style={{
                                top: `${hoveredCell.position.top}px`,
                                left: `${hoveredCell.position.left}px`,
                                transform: hoveredCell.position.showAbove 
                                  ? 'translate(-50%, -100%)' 
                                  : 'translate(-50%, 0)'
                              }}
                            >
                              <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">
                                {(row.displayName || row.userName)} - Hour {hour}:00
                              </div>
                              
                              {/* Total Count - All Issues */}
                              {cellInfo.totalIssuesCount > 0 && (
                                <div className="mb-3">
                                  <div className="font-semibold text-blue-400 mb-1">
                                    Total Count (All Issues): {cellInfo.totalIssuesCount}
                                  </div>
                                </div>
                              )}
                              
                              {/* Total Portfolios Monitored */}
                              {cellInfo.totalCount > 0 && (
                                <div className="mb-3">
                                  <div className="font-semibold text-green-400 mb-1">
                                    Total Portfolios Monitored ({cellInfo.totalCount}):
                                  </div>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {cellInfo.portfolioInstances && cellInfo.portfolioInstances.length > 0 ? (
                                      cellInfo.portfolioInstances.map((item, idx) => (
                                        <div key={idx} className="text-gray-200 pl-2">
                                          • {typeof item === 'string' ? item : item.portfolio} 
                                          {typeof item === 'object' && item.caseNumber && item.caseNumber !== 'N/A' && (
                                            <span className="text-gray-400 ml-2">(Case: {item.caseNumber})</span>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      cellInfo.portfolios.map((portfolio, idx) => (
                                        <div key={idx} className="text-gray-200 pl-2">
                                          • {portfolio}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Issues with "Yes" */}
                              {cellInfo.issuesYes.length > 0 && (
                                <div>
                                  <div className="font-semibold text-red-400 mb-1">
                                    Active Issues ({cellInfo.issuesYes.length}):
                                  </div>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {cellInfo.issuesYes.map((issue, idx) => (
                                      <div key={idx} className="bg-gray-800 rounded p-2 border-l-2 border-red-500">
                                        <div className="font-medium text-white">{issue.portfolio}</div>
                                        <div className="text-gray-300 text-xs mt-1">{issue.details}</div>
                                        <div className="text-gray-400 text-xs mt-1">
                                          Case: {issue.caseNumber} • {issue.date}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Arrow pointing to cell */}
                              <div 
                                className={`absolute left-1/2 transform -translate-x-1/2 border-4 border-transparent ${
                                  hoveredCell.position.showAbove 
                                    ? 'top-full -mt-1 border-t-gray-900' 
                                    : 'bottom-full mb-1 border-b-gray-900'
                                }`}
                              ></div>
                            </div>
                          )}
```

### User Coverage Performance Chart

**Bar Chart:**
- Shows top performers by portfolio coverage
- X-axis: User names (truncated if >20 chars)
- Y-axis: Total Portfolios Monitored
- Color gradient:
  - Top 3: Dark green gradient
  - Others: Light green gradient
- Clickable bars to see user details

**Export Functionality:**
- Export chart data to CSV
- Includes user names and portfolio counts

### User Detail Modal

When clicking a user in the chart or matrix:

**Summary Cards:**
- Total Count (all issues)
- Active Issues (Issue Present = Yes)
- Healthy Sites (Issue Present = No)
- Missed Alerts
- Total Portfolios Monitored
- Monitoring Active Hours

**Portfolios List:**
- Shows all unique portfolios monitored
- Displayed as colored badges

**Hourly Breakdown Chart:**
- Bar chart showing portfolios, issues, and active issues per hour
- Three bars per hour:
  - Green: Portfolios monitored
  - Blue: Total issues
  - Red: Active issues

**Detailed Hourly Breakdown Table:**
- Table format showing hour-by-hour statistics
- Columns: Hour, Portfolios, Total Count, Active Issues

### Export Functionality

**Export Matrix:**
- Exports entire matrix to CSV
- Includes user names, hour columns (0-23), and totals row
- Filename: `user_hour_coverage_matrix_YYYY-MM-DD.csv`

---

## Hover Tooltips & Card Interactions

### Portfolio Card Hover

**On Hover:**
1. **Card Shadow**: Increases (hover:shadow-md)
2. **Click Indicator**: "Click for options" badge appears (top-right)
   - Blue background if not locked
   - Purple background if locked
3. **Cursor**: Changes to pointer

**Tooltip Display:**
- Currently, tooltips are implemented but may show portfolio information
- Position: Above or below card based on viewport space
- Content: Portfolio details, lock status, last activity

**Code Reference:**
```2135:2155:client/src/components/SinglePageComplete.js
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const spaceAbove = rect.top;
                        const spaceBelow = viewportHeight - rect.bottom;
                        
                        // Show tooltip above if there's more space above, otherwise below
                        const showAbove = spaceAbove > spaceBelow;
                        
                        setHoveredPortfolio(portfolio.name);
                        setTooltipPosition({
                          top: showAbove ? rect.top - 10 : rect.bottom + 10,
                          left: rect.left + rect.width / 2,
                          showAbove: showAbove
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredPortfolio(null);
                        setTooltipPosition(null);
                      }}
```

### Coverage Matrix Cell Hover

**Tooltip Content:**
- User name and hour
- Total count of all issues
- List of portfolios monitored (with case numbers)
- List of active issues (Issue Present = Yes) with details

**Tooltip Positioning:**
- Appears above or below cell based on viewport space
- Centered on cell
- Dark background (gray-900) with white text
- Scrollable content if list is long

### Performance Analytics Hover

**Table Row Hover:**
- Green highlight (rgba(118, 171, 63, 0.1))
- Smooth transition

**Leaderboard Item Hover:**
- Background color change
- Shadow increase
- Cursor pointer

**Chart Bar Hover:**
- Tooltip shows user name and portfolio count
- Cursor pointer
- Clickable to see user details

---

## Code Snippets

### Key Component Files

1. **SinglePageComplete.js**: Main dashboard component
   - Location: `client/src/components/SinglePageComplete.js`
   - Lines: 1-2658
   - Contains: Portfolio cards, status logic, locking system

2. **TicketLoggingTable.js**: Issue logging form
   - Location: `client/src/components/TicketLoggingTable.js`
   - Lines: 1-1288
   - Contains: Form fields, validation, table display

3. **HourlyCoverageChart.js**: Coverage analysis chart
   - Location: `client/src/components/HourlyCoverageChart.js`
   - Lines: 1-225
   - Contains: Bar chart, date filters, tooltips

4. **PerformanceAnalytics.js**: Performance analytics tab
   - Location: `client/src/components/PerformanceAnalytics.js`
   - Lines: 1-856
   - Contains: Metrics, leaderboards, user stats

5. **IssuesByUser.js**: Issues by user tab
   - Location: `client/src/components/IssuesByUser.js`
   - Lines: 1-1031
   - Contains: User analytics, filters, table

6. **PortfolioMonitoringMatrix.js**: Coverage matrix
   - Location: `client/src/components/PortfolioMonitoringMatrix.js`
   - Lines: 1-1472
   - Contains: Matrix grid, hover tooltips, charts

### Database Tables

**portfolios:**
- `portfolio_id` (UUID)
- `name` (TEXT)
- `all_sites_checked` (BOOLEAN)
- `all_sites_checked_hour` (INTEGER)
- `all_sites_checked_date` (DATE)
- `all_sites_checked_by` (TEXT)
- `sites_checked_details` (TEXT)
- `site_range` (TEXT)

**issues:**
- `issue_id` (UUID)
- `portfolio_id` (UUID, FK)
- `site_id` (UUID, FK, nullable)
- `issue_hour` (INTEGER, 0-23)
- `issue_present` (TEXT: 'Yes' or 'No')
- `issue_details` (TEXT)
- `case_number` (TEXT, nullable)
- `monitored_by` (TEXT)
- `issues_missed_by` (TEXT, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**hour_reservations:**
- `id` (UUID)
- `portfolio_id` (UUID, FK)
- `issue_hour` (INTEGER)
- `monitored_by` (TEXT)
- `session_id` (TEXT)
- `reserved_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP)

### Real-time Updates

**Auto-refresh Intervals:**
- **Reservations**: Every 2 seconds (for lock status)
- **Data**: Every 15 seconds (for issues and portfolios)
- **Current Hour**: Every 60 seconds (minute update)

**Code Reference:**
```288:311:client/src/components/SinglePageComplete.js
    // CRITICAL: Poll for active reservations every 2 seconds for real-time locks
    // Synchronized refresh to ensure all instances see same data
    const reservationInterval = setInterval(() => {
      fetchActiveReservations();
    }, 2000); // 2s for consistent sync across all instances

    // Listen for admin unlock events to immediately refresh reservations
    const handlePortfolioUnlocked = () => {
      console.log('🔓 Portfolio unlocked by admin - refreshing reservations...');
      fetchActiveReservations();
      fetchDataBackground();
    };

    window.addEventListener('portfolioUnlocked', handlePortfolioUnlocked);
    
    // CRITICAL: Reload issues and portfolios every 15 seconds for real-time updates
    // Synchronized refresh interval to ensure all instances stay in sync
    const dataRefreshInterval = setInterval(async () => {
      setIsAutoRefreshing(true);
      console.log('🔄 Auto-refreshing dashboard data in background...');
      await fetchDataBackground(); // Use background fetch instead of regular fetchData
      await fetchActiveReservations(); // Also refresh reservations to show locks
      setTimeout(() => setIsAutoRefreshing(false), 300); // Show indicator briefly
    }, 15000); // 15s for consistent sync across all instances
```

---

## Summary

This documentation provides a comprehensive overview of the Dashboard & Log Issues page, covering:

- **26 Portfolio Cards** with real-time status indicators
- **Portfolio Locking System** with purple border indicators
- **Color-coded Status System** (Green/Blue/Yellow/Orange/Red)
- **Hourly Coverage Analysis** with interactive bar chart
- **Issue Logging Form** with validation and filtering
- **Navigation** to Issue Details view
- **Performance Analytics** with metrics and leaderboards
- **Issues by User** with detailed user analytics
- **Coverage Matrix** with hover tooltips
- **Hover Interactions** on cards and matrix cells

All features are synchronized in real-time across multiple users, with automatic refresh intervals ensuring data consistency.

---

*Document Generated: $(date)*
*Application Version: Portfolio Issue Tracker v1.0*
*Last Updated: Based on current codebase analysis*

