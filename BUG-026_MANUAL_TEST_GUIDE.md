# BUG-026 Manual Testing Guide
## Room List Visual State Fix - Step-by-Step Testing Instructions

**Date**: October 27, 2025
**Bug ID**: BUG-026
**Priority**: P1 - Critical
**Estimated Time**: 60-90 minutes

---

## ⚙️ Pre-Test Setup (5 minutes)

### Step 1: Verify Environment
1. Open terminal and check Docker containers:
   ```bash
   docker ps | grep lottodrop
   ```
   ✅ All 5 containers should show "(healthy)"

2. Verify frontend is accessible:
   - Open browser to http://localhost:80
   - Page should load with purple theme and particle background

### Step 2: Prepare Test Accounts
You'll need 2 test accounts for multi-player testing:

**Primary Account**:
- Username: testuser1
- Email: testuser1@example.com
- Password: Test123!
- Balance: $1000+

**Secondary Account**:
- Username: testuser2
- Email: testuser2@example.com
- Password: Test123!
- Balance: $1000+

### Step 3: Open Developer Tools
1. In Chrome/Firefox, press F12 to open DevTools
2. Go to **Console** tab
3. Filter for "WebSocket" or "socket" events
4. Keep console visible throughout testing

### Step 4: Prepare Timing Tools
- Have a stopwatch or timer ready
- Note taking application open
- Screenshot tool ready (Cmd+Shift+4 on Mac, Win+Shift+S on Windows)

---

## 🧪 TEST CASE 1: Core Bug Fix Verification (20 minutes)

### **Objective**: Verify "Joined" state clears after game completion and doesn't reappear

### Part A: Join Room and Establish Baseline

**Step 1.1**: Login with Primary Account
1. Navigate to http://localhost:80
2. Click "Login" button
3. Enter testuser1 credentials
4. Verify you see your balance in top-right corner

**Expected**: ✅ Logged in successfully, balance displayed

---

**Step 1.2**: Verify Initial Room List State
1. Observe the room cards displayed
2. All rooms should show purple "Join Room" button
3. No rooms should have "Joined" badge

**Expected**: ✅ Clean slate - no joined rooms

📸 **Screenshot**: Take screenshot labeled "1.2-initial-state.png"

---

**Step 1.3**: Join Fast Drop #1 Room
1. Find "Fast Drop #1" room card (should be $10 entry fee)
2. Click purple "Join Room" button
3. Modal appears with room details:
   - Entry Fee: $10
   - Your Balance: $XXXX
   - New Balance: $XXXX - $10
4. Click "Confirm Join" button

**Expected**:
- ✅ Modal appears with correct calculations
- ✅ Navigate to Game Room page
- ✅ Toast notification: "Successfully joined room!"

---

**Step 1.4**: Return to Room List
1. Click "Room List" link in navigation header
2. Observe "Fast Drop #1" room card

**Expected Results**:
- ✅ Purple "Joined" badge appears in top-right corner of card
- ✅ Button changes from purple "Join Room" to green "View Room"
- ✅ Prize pool shows $9 (after 10% fee deduction)
- ✅ Players shows "1/10"

📸 **Screenshot**: Take screenshot labeled "1.4-joined-state.png"

**Console Check**:
- Look for WebSocket connection message
- Should see "socket.io" connection established
- Note any errors (should be none)

---

### Part B: Trigger Game Completion While Staying on Room List

**Step 1.5**: Open Secondary Browser/Tab
1. Open **Incognito/Private window** (to use second account simultaneously)
2. Navigate to http://localhost:80
3. Login with testuser2 credentials
4. Navigate to Room List
5. Find "Fast Drop #1" room (should show "1/10" players)

**Expected**: ✅ Second user sees room with 1 participant

---

**Step 1.6**: Secondary User Joins Room
1. Click "Join Room" on "Fast Drop #1"
2. Confirm join in modal
3. **IMPORTANT**: Game will start immediately (min 2 players met)
4. Countdown will begin (5 seconds)
5. Winner selection will occur

**Expected**:
- ✅ Game starts automatically
- ✅ Countdown displayed
- ✅ Winner revealed after countdown

**⏱️ Start Timer**: Begin timing from the moment game completes

---

**Step 1.7**: Monitor Primary Browser (CRITICAL STEP)
**Switch back to primary browser window (testuser1)**

1. **DO NOT CLICK ANYTHING** - just observe
2. **Stay on the Room List page** - do not navigate away
3. Watch "Fast Drop #1" room card continuously

**Expected Immediate Changes** (within 1-2 seconds):
- ✅ Purple "Joined" badge **disappears**
- ✅ Green "View Room" button changes to purple "Join Room"
- ✅ Prize pool resets to $0
- ✅ Players changes to "0/10"
- ✅ Toast notification appears with winner announcement

📸 **Screenshot**: Take screenshot labeled "1.7-after-completion.png"

**Console Check**:
```javascript
// You should see this event in console:
global-game-completed {
  roomId: "...",
  roomName: "Fast Drop #1",
  winners: [...]
}
```

**⚠️ CRITICAL BUG INDICATOR**:
If "Joined" badge is **still visible** after 5 seconds → **BUG NOT FIXED**

---

**Step 1.8**: Wait for Polling Interval (CRITICAL STEP)

**This is the most important part of the test!**

1. **Keep watching "Fast Drop #1" room card**
2. **Do not interact with the page**
3. **Wait for exactly 65 seconds** (60s polling + 5s buffer)
4. Use your timer/stopwatch
5. Continuously observe the room card state

**Expected Behavior Throughout 65 Seconds**:
- ✅ Button **stays purple "Join Room"** the entire time
- ✅ "Joined" badge **NEVER reappears**
- ✅ No flickering or state changes
- ✅ Prize pool stays at $0
- ✅ Players stays at "0/10"

📸 **Screenshot**: At exactly 60 seconds, take screenshot labeled "1.8-after-polling.png"

**Console Check**:
- Around 60 seconds, you should see network request to `/api/rooms`
- Response should show room with `participants: []` (empty array)
- No errors should appear

**⚠️ CRITICAL BUG INDICATOR**:
If at any point during these 65 seconds:
- "Joined" badge **reappears** → **BUG NOT FIXED** ❌
- Button turns **green "View Room"** → **BUG NOT FIXED** ❌
- Console shows **errors** → **POTENTIAL REGRESSION** ⚠️

---

**Step 1.9**: Verify Room Reset
1. Continue watching for another 10 seconds (total ~75 seconds)
2. Room should transition from "completed" to "waiting" status

**Expected**:
- ✅ Room status indicator updates
- ✅ Button remains purple "Join Room"
- ✅ Room is ready for new game
- ✅ No "Joined" state appears

---

### Part C: Test Results Recording

**Test Case 1 Results**:
- [ ] PASS - "Joined" cleared immediately after game completion
- [ ] PASS - No reappearance after 60s polling interval
- [ ] PASS - No console errors
- [ ] PASS - Room reset cleanly

**OR**

- [ ] FAIL - Issue: ___________________________
- [ ] FAIL - Issue: ___________________________

**Performance Metrics**:
- Game completion to visual update: ______ seconds
- Polling interval observed at: ______ seconds
- Total user-perceived smoothness: Excellent / Good / Poor

---

## 🧪 TEST CASE 2: Multiple Rooms Simultaneously (15 minutes)

### **Objective**: Verify multiple rooms update independently without cross-contamination

**Step 2.1**: Reset Test State
1. Ensure primary user has $300+ balance
2. All rooms should be in WAITING state
3. No rooms should show "Joined"

---

**Step 2.2**: Join Three Different Rooms
1. Join "Fast Drop #1" ($10)
2. Join "Fast Drop #3" ($50)
3. Join "Fast Drop #4" ($100)

**Expected**:
- ✅ All 3 rooms show "Joined" badge
- ✅ All 3 buttons are green "View Room"
- ✅ Balance decreases by $160 total

📸 **Screenshot**: Take screenshot labeled "2.2-three-joined.png"

---

**Step 2.3**: Trigger All Three Games
Using 3 different incognito windows/tabs with 3 different accounts:
1. Window A → Join "Fast Drop #1" (game starts)
2. Window B → Join "Fast Drop #3" (game starts)
3. Window C → Join "Fast Drop #4" (game starts)

**Expected**: All 3 games start within 30 seconds of each other

---

**Step 2.4**: Monitor Room List (Primary Browser)
1. Switch to primary browser
2. Stay on Room List page
3. Watch all 3 room cards as games complete

**Expected** (as each game completes):
- ✅ Each room's "Joined" badge disappears **independently**
- ✅ All 3 buttons change to purple "Join Room"
- ✅ 3 winner toasts appear (stacked vertically)
- ✅ No visual glitches or cross-contamination

📸 **Screenshot**: After all 3 complete, take screenshot labeled "2.4-all-completed.png"

---

**Step 2.5**: Wait for Polling (65 seconds)
1. Wait 65+ seconds after last game completion
2. Monitor all 3 rooms continuously

**Expected**:
- ✅ All 3 rooms stay in "not joined" state
- ✅ No "Joined" badges reappear on any room
- ✅ All buttons remain purple "Join Room"

**Test Case 2 Results**:
- [ ] PASS - All rooms updated independently
- [ ] PASS - No state leakage between rooms
- [ ] PASS - Polling didn't cause reversion
- [ ] FAIL - Issue: ___________________________

---

## 🧪 TEST CASE 3: Room Reset and Re-Join (10 minutes)

### **Objective**: Verify clean state management through full lifecycle

**Step 3.1**: Join and Complete One Game
1. Join "Fast Drop #1" ($10)
2. Trigger game completion (with second user)
3. Verify "Joined" clears

**Expected**: ✅ "Joined" clears after completion

---

**Step 3.2**: Wait for Room Reset
1. Wait 10 seconds after completion
2. Room should reset to WAITING status

**Expected**:
- ✅ Room status = WAITING
- ✅ Button stays purple "Join Room" (critical!)
- ✅ Prize pool = $0
- ✅ Players = 0/10

---

**Step 3.3**: Re-Join Same Room
1. Click purple "Join Room" button on "Fast Drop #1"
2. Confirm join

**Expected**:
- ✅ Modal appears normally
- ✅ Join succeeds
- ✅ "Joined" badge appears
- ✅ Button turns green "View Room"
- ✅ State management is clean (no stale data)

**Console Check**: No errors related to state updates

**Test Case 3 Results**:
- [ ] PASS - Room reset cleanly
- [ ] PASS - Re-join worked correctly
- [ ] PASS - No stale state issues
- [ ] FAIL - Issue: ___________________________

---

## 🧪 TEST CASE 4: Page Refresh Verification (10 minutes)

### **Objective**: Verify backend participant data is cleared correctly

**Step 4.1**: Join Room and Complete Game
1. Join "Fast Drop #1"
2. Trigger game completion
3. Verify "Joined" clears

**Expected**: ✅ Visual state clears

---

**Step 4.2**: Wait for Backend Cleanup
1. Wait 15 seconds after game completion
2. This gives backend time to clear participants array

---

**Step 4.3**: Hard Refresh Page
1. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
2. Wait for page to reload completely
3. Observe "Fast Drop #1" room card

**Expected**:
- ✅ Fresh data loaded from API
- ✅ Room shows purple "Join Room" button
- ✅ No "Joined" badge appears
- ✅ State is built from clean backend data

---

**Step 4.4**: Verify API Response
1. Open DevTools → Network tab
2. Find `/api/rooms` request
3. Click on it → Preview tab
4. Find "Fast Drop #1" room in response

**Expected JSON**:
```json
{
  "id": "...",
  "name": "Fast Drop #1",
  "participants": [],           // ✅ MUST be empty array
  "current_players": "0",       // ✅ MUST be "0"
  "status": "WAITING"
}
```

📸 **Screenshot**: Capture API response labeled "4.4-api-response.png"

**Test Case 4 Results**:
- [ ] PASS - Page refresh showed clean state
- [ ] PASS - API response has empty participants
- [ ] PASS - No "Joined" state persists
- [ ] FAIL - Issue: ___________________________

---

## 🧪 TEST CASE 5: Leave During Active Game (10 minutes)

### **Objective**: Verify leaving mid-game doesn't cause state corruption

**Step 5.1**: Join Room
1. Join "Fast Drop #1"
2. Verify "Joined" badge appears

**Expected**: ✅ "Joined" badge visible

---

**Step 5.2**: Start Game (In Progress)
1. Use secondary account to join same room
2. Game starts (status = IN_PROGRESS)
3. Countdown begins

**Expected**: ✅ Game status = IN_PROGRESS

---

**Step 5.3**: Leave Room Mid-Game
1. In primary browser, click "View Room" to enter game room
2. Click "Leave Room" button
3. Confirm leave action
4. Navigate back to Room List

**Expected**:
- ✅ Leave succeeds
- ✅ Navigate to Room List
- ✅ "Joined" badge is gone
- ✅ Button is purple "Join Room"

---

**Step 5.4**: Game Completes
1. Wait for game to complete
2. Winner notification appears

**Expected**:
- ✅ Winner toast appears
- ✅ Room card stays in "not joined" state
- ✅ No "Joined" badge appears
- ✅ Button stays purple

---

**Step 5.5**: Monitor for 65 Seconds
1. Wait for polling cycle
2. Continuously observe state

**Expected**:
- ✅ State remains stable
- ✅ No state corruption
- ✅ No "Joined" reappearance

**Test Case 5 Results**:
- [ ] PASS - Leave during game worked
- [ ] PASS - No re-addition to "Joined" state
- [ ] PASS - State remained stable through polling
- [ ] FAIL - Issue: ___________________________

---

## 🌐 CROSS-BROWSER TESTING (15 minutes)

### Test in Multiple Browsers

**Browser 1: Chrome/Edge (Chromium)**
1. Execute Test Case 1 (core verification)
2. Record results:
   - [ ] PASS - Visual state correct
   - [ ] PASS - No console errors
   - [ ] PASS - WebSocket events working
   - [ ] FAIL - Issue: ___________________________

---

**Browser 2: Firefox**
1. Execute Test Case 1 (core verification)
2. Record results:
   - [ ] PASS - Visual state correct
   - [ ] PASS - No console errors
   - [ ] PASS - WebSocket events working
   - [ ] FAIL - Issue: ___________________________

---

**Browser 3: Safari (if available)**
1. Execute Test Case 1 (core verification)
2. Record results:
   - [ ] PASS - Visual state correct
   - [ ] PASS - No console errors
   - [ ] PASS - WebSocket events working
   - [ ] FAIL - Issue: ___________________________

---

## ⚡ PERFORMANCE TESTING (10 minutes)

### Metrics to Record

**During Test Case 1 Execution**:

1. **Game Completion to Visual Update**
   - Start: When game completes (winner revealed)
   - End: When "Joined" badge disappears
   - Time: _______ milliseconds
   - Target: < 2000ms
   - Result: [ ] PASS [ ] FAIL

2. **Polling Interval Accuracy**
   - Expected: 60 seconds
   - Observed: _______ seconds
   - Tolerance: ±2 seconds
   - Result: [ ] PASS [ ] FAIL

3. **API Response Time** (Network tab)
   - `/api/rooms` request time: _______ ms
   - Target: < 200ms
   - Result: [ ] PASS [ ] FAIL

4. **Memory Usage** (Task Manager / Activity Monitor)
   - Before testing: _______ MB
   - After 5 test cycles: _______ MB
   - Memory leak detected: [ ] Yes [ ] No

5. **React Component Re-renders** (React DevTools Profiler)
   - Unnecessary re-renders: [ ] Yes [ ] No
   - Components updated: _______
   - Performance: Excellent / Good / Poor

---

## 🔄 REGRESSION TESTING (15 minutes)

### Verify Existing Features Still Work

**Join Room Flow**:
- [ ] "Join Room" button works for new rooms
- [ ] Modal displays correctly with calculations
- [ ] Balance validation works
- [ ] Toast notifications appear
- [ ] Navigation to Game Room succeeds

**View Room Flow**:
- [ ] "View Room" button works for joined rooms
- [ ] Direct navigation succeeds
- [ ] No modal required
- [ ] Room state persists

**Filter Tabs**:
- [ ] "All Rooms" shows all rooms
- [ ] "Fast Drop" filters correctly
- [ ] "Time Drop" filters correctly (if available)
- [ ] Badge counts are accurate
- [ ] Smooth transitions

**Balance Display**:
- [ ] Balance visible when authenticated
- [ ] Updates after joining room
- [ ] Format is correct ($X,XXX)
- [ ] Updates after winning (if applicable)

**Room Card Animations**:
- [ ] Hover effect works (scale 1.02)
- [ ] Tap effect works (scale 0.98)
- [ ] Smooth transitions
- [ ] No performance issues

**Notifications**:
- [ ] Winner toasts appear for all users
- [ ] Duration is ~8 seconds
- [ ] Multiple toasts stack correctly
- [ ] Styling matches purple theme

**WebSocket Connection**:
- [ ] Connects on page load
- [ ] Receives events in real-time
- [ ] No duplicate events
- [ ] Clean disconnect on navigation

---

## 📋 FINAL TEST SUMMARY

### Overall Results

**Test Cases Executed**: _____ / 5
**Test Cases Passed**: _____ / 5
**Test Cases Failed**: _____ / 5

**Pass Rate**: _____%

---

### Critical Issues Found (P1)
1. _________________________________________________________________
2. _________________________________________________________________

### High Priority Issues Found (P2)
1. _________________________________________________________________
2. _________________________________________________________________

### Medium Priority Issues Found (P3)
1. _________________________________________________________________
2. _________________________________________________________________

### Low Priority Issues Found (P4)
1. _________________________________________________________________
2. _________________________________________________________________

---

### Screenshots Collected
- [ ] 1.2-initial-state.png
- [ ] 1.4-joined-state.png
- [ ] 1.7-after-completion.png
- [ ] 1.8-after-polling.png
- [ ] 2.2-three-joined.png
- [ ] 2.4-all-completed.png
- [ ] 4.4-api-response.png

---

### Console Errors Logged
```
[Copy any console errors here]

Example:
[12:34:56] WebSocket connection failed
[12:35:01] TypeError: Cannot read property 'id' of undefined
```

---

### Performance Summary
- Average visual update time: _______ ms
- Polling interval accuracy: _______ seconds
- Memory usage increase: _______ MB
- Overall performance: Excellent / Good / Poor

---

## ✅ PRODUCTION READINESS RECOMMENDATION

Based on testing results, this fix is:

- [ ] **READY FOR PRODUCTION** ✅
  - All test cases passed
  - No critical issues found
  - Performance is acceptable
  - Regression tests passed
  - Cross-browser compatible

- [ ] **NOT READY FOR PRODUCTION** ❌
  - Reason: _______________________________________________________
  - Blockers: _____________________________________________________
  - Required fixes: ________________________________________________

- [ ] **READY WITH CAVEATS** ⚠️
  - Minor issues found: ____________________________________________
  - Workarounds available: _________________________________________
  - Recommend monitoring: __________________________________________

---

### Tester Signature

**Name**: ___________________________
**Date**: ___________________________
**Time Spent**: ______ minutes
**Confidence Level**: High / Medium / Low

---

### Notes & Observations

_Use this space to record any additional observations, edge cases discovered, or recommendations for future improvements:_

```
Example observations:
- Animation performance was slightly slower in Firefox
- Winner notification stacking could be improved for 5+ simultaneous wins
- Consider adding visual indicator during polling intervals
- Room card transitions are very smooth
- Purple theme is visually appealing and consistent
```

---

## 🆘 Troubleshooting

### If Containers Are Not Running
```bash
cd /Users/rd/Documents/Projects/LottoDrop
docker-compose up -d
docker ps  # Verify all healthy
```

### If Frontend Won't Load
```bash
docker logs lottodrop-frontend --tail 50
# Check for build errors or nginx issues
```

### If Backend Connection Fails
```bash
docker logs lottodrop-backend --tail 50
# Check for API errors or database connection issues
```

### If Test Accounts Don't Exist
Create via Admin Panel:
1. Navigate to http://localhost:81
2. Login with admin credentials
3. Go to Users → Create New User
4. Set balance to $1000

---

## 📞 Support

For questions or issues during testing:
- Check CLAUDE.md for project documentation
- Review BUG-026_TESTING_REPORT.md for detailed test specifications
- Consult React DevTools for component state inspection
- Check browser console for WebSocket events and errors

---

*Manual Test Guide Version: 1.0*
*Created: October 27, 2025*
*Bug: BUG-026 - Room List Visual State Not Updating After Game Completion*
*Priority: P1 - Critical*
