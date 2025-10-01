#!/usr/bin/env node

/**
 * Test script to validate the critical socket broadcast fix
 * Tests that user-joined events are only sent to OTHER users, not the joining user
 */

const { io } = require('socket.io-client');

// Test configuration
const BACKEND_URL = 'http://localhost:3001';
const TEST_ROOM_ID = 'test-room-123';

// Mock JWT tokens for testing (you'll need to replace with actual valid tokens)
const USER_A_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLWEtaWQiLCJpYXQiOjE2ODc1MjQwMDB9.test';
const USER_B_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLWItaWQiLCJpYXQiOjE2ODc1MjQwMDB9.test';

console.log('🧪 Starting Socket Broadcast Fix Validation Test...\n');

async function runTest() {
  let userAReceiveCount = 0;
  let userBReceiveCount = 0;
  let testResult = 'PENDING';

  // Create two socket connections
  const socketA = io(BACKEND_URL, {
    auth: { token: USER_A_TOKEN },
    transports: ['websocket']
  });

  const socketB = io(BACKEND_URL, {
    auth: { token: USER_B_TOKEN },
    transports: ['websocket']
  });

  // Set up event listeners
  socketA.on('user-joined', (data) => {
    userAReceiveCount++;
    console.log(`❌ CRITICAL: User A received user-joined event! This indicates the bug is NOT fixed.`);
    console.log(`   Event data:`, data);
  });

  socketB.on('user-joined', (data) => {
    userBReceiveCount++;
    console.log(`✅ EXPECTED: User B received user-joined event for another user joining.`);
    console.log(`   Event data:`, data);
  });

  // Connection handlers
  socketA.on('connect', () => {
    console.log('🔗 User A connected');
  });

  socketB.on('connect', () => {
    console.log('🔗 User B connected');

    // Wait a moment for connections to stabilize, then run test
    setTimeout(() => {
      console.log('\n🚀 Starting test sequence...\n');

      // First, have User B join the room to be a spectator
      console.log('📍 Step 1: User B joins room as observer');
      socketB.emit('join-room', TEST_ROOM_ID);

      // Then have User A join the room - this should NOT trigger user-joined for User A
      setTimeout(() => {
        console.log('📍 Step 2: User A joins room (this should NOT send user-joined to User A)');
        socketA.emit('join-room', TEST_ROOM_ID);

        // Evaluate results after events have time to propagate
        setTimeout(() => {
          console.log('\n📊 TEST RESULTS:');
          console.log(`   User A received user-joined events: ${userAReceiveCount}`);
          console.log(`   User B received user-joined events: ${userBReceiveCount}`);

          if (userAReceiveCount === 0 && userBReceiveCount >= 1) {
            testResult = 'PASSED ✅';
            console.log('\n🎉 SUCCESS: Fix is working correctly!');
            console.log('   - User A did NOT receive their own join event');
            console.log('   - User B received the join event for User A');
          } else if (userAReceiveCount > 0) {
            testResult = 'FAILED ❌';
            console.log('\n💥 FAILURE: Bug still exists!');
            console.log('   - User A incorrectly received their own join event');
            console.log('   - This will cause the "View Room" button bug');
          } else {
            testResult = 'INCONCLUSIVE ⚠️';
            console.log('\n⚠️ INCONCLUSIVE: Test may need more time or different setup');
          }

          console.log(`\n🏁 Final Result: ${testResult}\n`);

          // Cleanup
          socketA.disconnect();
          socketB.disconnect();
          process.exit(userAReceiveCount === 0 ? 0 : 1);
        }, 3000);
      }, 1000);
    }, 1000);
  });

  // Error handlers
  socketA.on('connect_error', (error) => {
    console.error('❌ User A connection error:', error.message);
  });

  socketB.on('connect_error', (error) => {
    console.error('❌ User B connection error:', error.message);
  });
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n⛔ Test interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the test
runTest().catch(console.error);