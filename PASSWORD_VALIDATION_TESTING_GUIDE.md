# Password Validation - Manual Testing Guide

**Date**: October 29, 2025
**Feature**: Enhanced Password Validation & Backend Error Handling
**Status**: ✅ Deployed

---

## 📋 Overview

This guide provides comprehensive manual testing procedures for the enhanced password validation feature on the Create Account form.

### Changes Implemented

1. **Frontend Password Policy**:
   - Minimum 12 characters
   - At least 1 uppercase letter (A-Z)
   - At least 1 symbol from: `! @ # $ % ^ & * ( ) _ + - = { } [ ] : ; " ' < > , . ? / \ | ~`

2. **Inline Validation**:
   - Real-time error display with bullet points
   - Helper text: "Use at least 12 characters, with 1 uppercase and 1 symbol (e.g., !, @, #)."
   - Validation triggers on blur and submit

3. **Backend Error Surfacing**:
   - Backend password errors displayed inline under Password field
   - General errors (email exists, etc.) shown at top of form
   - No silent failures

4. **Accessibility**:
   - ARIA labels: `aria-invalid`, `aria-describedby`
   - Screen reader support with `role="alert"`
   - Focus management on first invalid field

5. **Button Behavior**:
   - Disabled while submitting
   - Disabled when form is invalid

---

## 🧪 Test Cases

### Test Case 1: Valid Passwords

**Objective**: Verify that valid passwords are accepted and allow form submission.

| Password | Expected Result | ✓ |
|----------|----------------|---|
| `Abcdefghij!k` | ✅ Accepted (12 chars, uppercase, symbol) | |
| `Password123!` | ✅ Accepted (12 chars, uppercase, symbol) | |
| `Test@Account1` | ✅ Accepted (14 chars, uppercase, symbol) | |
| `MyP@ssw0rd!!` | ✅ Accepted (12 chars, multiple uppercase/symbols) | |
| `ALLCAPS123!@#` | ✅ Accepted (14 chars, all uppercase, symbols) | |
| `Long!Password@With#Symbols$123` | ✅ Accepted (31 chars) | |

**Steps**:
1. Navigate to http://localhost
2. Click "Register" or "Create Account"
3. Fill in First Name, Last Name, Email
4. Enter test password in Password field
5. Enter same password in Confirm Password
6. Verify:
   - ✅ No error messages shown
   - ✅ Helper text displayed: "Use at least 12 characters, with 1 uppercase and 1 symbol (e.g., !, @, #)."
   - ✅ Create Account button is **enabled**
   - ✅ Clicking Create Account attempts submission

---

### Test Case 2: Invalid Password - Too Short

**Objective**: Verify rejection of passwords less than 12 characters.

| Password | Length | Expected Error | ✓ |
|----------|--------|----------------|---|
| `Abc!defGhij` | 11 | "At least 12 characters" | |
| `Abcd!123` | 8 | "At least 12 characters" | |
| `Test@1` | 6 | "At least 12 characters" | |
| `A!` | 2 | "At least 12 characters" | |

**Steps**:
1. Open Create Account form
2. Enter password that is 11 characters or less
3. Click outside Password field (blur)
4. Verify:
   - ✅ Error message appears: "At least 12 characters" (in red bullet point)
   - ✅ Password field has red border
   - ✅ Create Account button is **disabled**
5. Try to submit form
6. Verify:
   - ✅ Form does not submit
   - ✅ Focus returns to Password field
   - ✅ Error persists

**Screenshot Location**: `Password field with "At least 12 characters" error`

---

### Test Case 3: Invalid Password - No Uppercase

**Objective**: Verify rejection of passwords without uppercase letters.

| Password | Has Uppercase | Expected Error | ✓ |
|----------|--------------|----------------|---|
| `abcdefghijkl!` | No | "At least 1 uppercase letter (A-Z)" | |
| `lowercase@password` | No | "At least 1 uppercase letter (A-Z)" | |
| `password123!` | No | "At least 1 uppercase letter (A-Z)" | |
| `12345678910!` | No | "At least 1 uppercase letter (A-Z)" | |

**Steps**:
1. Open Create Account form
2. Enter password with 12+ chars and symbol but no uppercase
3. Click outside Password field (blur)
4. Verify:
   - ✅ Error message: "At least 1 uppercase letter (A-Z)"
   - ✅ Password field has red border
   - ✅ Create Account button is **disabled**

---

### Test Case 4: Invalid Password - No Symbol

**Objective**: Verify rejection of passwords without special symbols.

| Password | Has Symbol | Expected Error | ✓ |
|----------|-----------|----------------|---|
| `Abcdefghijkl` | No | "At least 1 symbol (!, @, #, etc.)" | |
| `Password1234` | No | "At least 1 symbol (!, @, #, etc.)" | |
| `UPPERCASEPASSWORD` | No | "At least 1 symbol (!, @, #, etc.)" | |
| `TestPassword123` | No | "At least 1 symbol (!, @, #, etc.)" | |

**Steps**:
1. Open Create Account form
2. Enter password with 12+ chars and uppercase but no symbol
3. Click outside Password field (blur)
4. Verify:
   - ✅ Error message: "At least 1 symbol (!, @, #, etc.)"
   - ✅ Password field has red border
   - ✅ Create Account button is **disabled**

---

### Test Case 5: Invalid Password - Multiple Errors

**Objective**: Verify multiple validation errors are displayed.

| Password | Errors | Expected Display | ✓ |
|----------|--------|-----------------|---|
| `abc` | All 3 | All 3 bullet points shown | |
| `abcdefg!` | Length + Uppercase | 2 bullet points | |
| `Abcdefgh` | Length + Symbol | 2 bullet points | |
| `abcdefghijklmno` | Uppercase + Symbol | 2 bullet points | |

**Steps**:
1. Open Create Account form
2. Enter password: `abc`
3. Click outside Password field (blur)
4. Verify error list shows ALL THREE:
   - ✅ "At least 12 characters"
   - ✅ "At least 1 uppercase letter (A-Z)"
   - ✅ "At least 1 symbol (!, @, #, etc.)"
5. Password field has red border
6. Create Account button is disabled

---

### Test Case 6: Confirm Password Mismatch

**Objective**: Verify password confirmation validation.

**Steps**:
1. Open Create Account form
2. Enter valid password: `TestPassword123!`
3. Enter different password in Confirm Password: `DifferentPass456!`
4. Click outside Confirm Password field (blur)
5. Verify:
   - ✅ Error message: "Passwords do not match"
   - ✅ Confirm Password field has red border
   - ✅ Create Account button is **disabled**
6. Correct the Confirm Password to match
7. Verify:
   - ✅ Error disappears
   - ✅ Red border removed
   - ✅ Create Account button is **enabled**

---

### Test Case 7: Backend Password Error

**Objective**: Verify backend validation errors are surfaced inline.

**Setup**: This test simulates backend returning password validation error.

**Mock Backend Response**:
```json
{
  "error": "Password must be at least 12 characters long",
  "score": 0
}
```

**Steps**:
1. Open Create Account form
2. Fill all fields with valid data
3. Submit form (backend should return error)
4. Verify:
   - ✅ Error appears **inline** under Password field (not as toast)
   - ✅ Error text: "Password must be at least 12 characters long"
   - ✅ Password field has red border
   - ✅ Focus returns to Password field
   - ✅ No toast notification shown
5. Start typing in Password field
6. Verify:
   - ✅ Backend error clears as user types
   - ✅ Frontend validation takes over

**Alternative Backend Errors to Test**:
- `"Password must contain an uppercase letter"` → Shows inline
- `"Password must contain a symbol"` → Shows inline
- `"Password does not meet requirements"` → Shows inline

---

### Test Case 8: Backend General Error (Non-Password)

**Objective**: Verify non-password errors (e.g., email exists) are shown at top of form.

**Mock Backend Response**:
```json
{
  "error": "Email already exists",
  "score": 0
}
```

**Steps**:
1. Open Create Account form
2. Fill form with valid data
3. Submit form (backend returns "Email already exists")
4. Verify:
   - ✅ Error appears at **top of form** (not under any field)
   - ✅ Error has red background box with border
   - ✅ Error text: "Email already exists"
   - ✅ Password field does NOT show error
   - ✅ Form remains open (not closed)

---

### Test Case 9: Real-time Validation Behavior

**Objective**: Verify validation triggers correctly.

**Steps**:
1. Open Create Account form
2. Click in Password field, do NOT type anything
3. Click outside Password field (blur)
4. Verify:
   - ✅ No error shown (field is empty, validation doesn't trigger until user types)
5. Type `abc` in Password field
6. Click outside (blur)
7. Verify:
   - ✅ Error list appears immediately
8. Continue typing to fix errors: `Abc!defghijk`
9. Click outside (blur)
10. Verify:
    - ✅ Error list disappears
    - ✅ Helper text reappears

---

### Test Case 10: Submit Button States

**Objective**: Verify Create Account button disabling logic.

| Scenario | Button State | ✓ |
|----------|-------------|---|
| All fields empty | Disabled | |
| Password invalid (frontend) | Disabled | |
| Passwords don't match | Disabled | |
| All fields valid | Enabled | |
| Form submitting | Disabled + Loading spinner | |
| Backend error returned | Enabled (allow retry) | |

**Steps**:
1. Open Create Account form
2. Verify button is **disabled** initially
3. Fill all fields correctly
4. Verify button is **enabled**
5. Make password invalid (remove 1 char)
6. Verify button is **disabled**
7. Fix password
8. Submit form
9. Verify:
   - ✅ Button shows loading spinner
   - ✅ Button is disabled during submission
10. If error occurs, verify button re-enables for retry

---

### Test Case 11: Accessibility - Screen Reader

**Objective**: Verify ARIA attributes and screen reader support.

**Tools**: VoiceOver (Mac), NVDA (Windows), or JAWS

**Steps**:
1. Enable screen reader
2. Navigate to Create Account form
3. Tab to Password field
4. Verify screen reader announces:
   - ✅ Label: "Password"
   - ✅ Helper text (when no error)
5. Enter invalid password: `abc`
6. Tab out (blur)
7. Verify screen reader announces:
   - ✅ "Invalid" or "Error"
   - ✅ Error messages in list
8. Tab to Confirm Password field
9. Enter mismatched password
10. Tab out (blur)
11. Verify screen reader announces:
    - ✅ "Invalid"
    - ✅ "Passwords do not match"

**Developer Tools Check**:
1. Inspect Password input in DevTools
2. Verify attributes:
   - ✅ `aria-invalid="true"` when field has error
   - ✅ `aria-invalid="false"` or omitted when valid
   - ✅ `aria-describedby` points to error or helper text ID
   - ✅ Error container has `role="alert"`

---

### Test Case 12: Focus Management

**Objective**: Verify focus moves to first invalid field on submit.

**Steps**:
1. Open Create Account form
2. Fill First Name, Last Name, Email correctly
3. Leave Password empty or invalid
4. Fill Confirm Password correctly
5. Click Create Account
6. Verify:
   - ✅ Focus moves to Password field (first invalid field)
   - ✅ Validation error appears
   - ✅ Form does NOT submit

**Scenario 2: Confirm Password Invalid**:
1. Fill all fields correctly
2. Make Confirm Password incorrect
3. Click Create Account
4. Verify:
   - ✅ Focus moves to Confirm Password field
   - ✅ Error appears

---

### Test Case 13: Helper Text Display

**Objective**: Verify helper text appears correctly.

**Steps**:
1. Open Create Account form
2. Verify Password field shows:
   - ✅ Helper text: "Use at least 12 characters, with 1 uppercase and 1 symbol (e.g., !, @, #)."
   - ✅ Text color is gray (neutral, not error)
3. Enter invalid password and blur
4. Verify:
   - ✅ Helper text is replaced by error list
   - ✅ Error text is red
5. Fix password
6. Verify:
   - ✅ Helper text reappears
   - ✅ Error list disappears

---

### Test Case 14: Edge Cases

**Objective**: Test unusual inputs.

| Input | Expected Behavior | ✓ |
|-------|------------------|---|
| Password with spaces: `My Password 123!` | ✅ Accepted | |
| Password with unicode: `Pässwörd123!` | ✅ Accepted | |
| Password with emoji: `Password123!😀` | ✅ Accepted | |
| Very long password (50+ chars) | ✅ Accepted | |
| Paste password from clipboard | ✅ Validation works | |
| Autofill password (browser) | ✅ Validation works on blur | |
| Password field autocomplete | ✅ Validation works | |

---

### Test Case 15: All Symbols Test

**Objective**: Verify all allowed symbols work.

**Allowed Symbols**:
```
! @ # $ % ^ & * ( ) _ + - = [ ] { } : ; " ' < > , . ? / \ | ~
```

**Steps**:
1. For each symbol, create password: `TestPassword[symbol]`
2. Example: `TestPassword!`, `TestPassword@`, `TestPassword#`, etc.
3. Verify:
   - ✅ All symbols are accepted
   - ✅ No "At least 1 symbol" error appears

---

## 🖥️ Browser Compatibility Testing

Test the feature in multiple browsers:

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | Latest | ⬜ | |
| Firefox | Latest | ⬜ | |
| Safari | Latest | ⬜ | |
| Edge | Latest | ⬜ | |

---

## 🔍 DevTools Inspection Checklist

### Network Tab
1. Submit valid form
2. Check request to `/api/auth/register`
3. Verify:
   - ✅ Password is sent in request body
   - ✅ confirmPassword is NOT sent (frontend only)

### Console Tab
1. Open form
2. Interact with Password field
3. Verify:
   - ✅ No console errors
   - ✅ No React warnings
   - ✅ Validation logic executes without errors

### Elements Tab
1. Inspect Password input
2. Verify HTML attributes:
   ```html
   <input
     id="[unique-id]"
     type="password"
     aria-invalid="true/false"
     aria-describedby="[error-id or helper-id]"
     ...
   />
   ```
3. Inspect error container:
   ```html
   <div id="[error-id]" role="alert" class="...text-error...">
     <ul class="list-disc ...">
       <li>At least 12 characters</li>
       ...
     </ul>
   </div>
   ```

---

## 🎯 Acceptance Criteria Verification

| Criterion | Status | Notes |
|-----------|--------|-------|
| Password policy enforced (12 chars, uppercase, symbol) | ⬜ | |
| Inline validation on blur | ⬜ | |
| Inline validation on submit | ⬜ | |
| Helper text displays correctly | ⬜ | "Use at least 12 characters..." |
| Error list shows unmet rules | ⬜ | Bullet points in red |
| Backend errors surface inline | ⬜ | No toast-only errors |
| Confirm Password validates match | ⬜ | "Passwords do not match" |
| Create Account button disables when invalid | ⬜ | |
| Create Account button disables while submitting | ⬜ | Loading spinner shown |
| Focus moves to first invalid field | ⬜ | |
| ARIA attributes present | ⬜ | aria-invalid, aria-describedby |
| Screen reader announces errors | ⬜ | role="alert" |
| Dark theme preserved | ⬜ | Red errors, gray helper text |
| No toast for password errors | ⬜ | Inline only |
| Backend error clears when typing | ⬜ | |

---

## 📝 Test Results

**Tester Name**: _________________
**Date**: _________________
**Environment**:
- Frontend: http://localhost
- Backend: http://localhost:3001

**Overall Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked

**Issues Found**:
1. _______________________________________________________
2. _______________________________________________________
3. _______________________________________________________

**Comments**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## 🚀 Automated Tests

Unit tests for password validator are located at:
```
frontend/src/utils/__tests__/passwordValidator.test.ts
```

**Run Tests**:
```bash
cd frontend
npm run test -- passwordValidator.test.ts
```

**Expected Result**: ✅ 51 tests pass

---

## 📊 Performance Verification

**Bundle Size Impact**:
- Before: 283.08 kB
- After: 285.15 kB
- Increase: +2.07 kB (acceptable)

**Load Time**:
- Target: <2 seconds for form load
- Actual: _____ seconds

---

## 🔗 Related Documentation

- Password Validator Code: `/frontend/src/utils/passwordValidator.ts`
- AuthModal Component: `/frontend/src/components/organisms/AuthModal/AuthModal.tsx`
- Input Component: `/frontend/src/components/atoms/Input/Input.tsx`
- Unit Tests: `/frontend/src/utils/__tests__/passwordValidator.test.ts`

---

**Test Guide Version**: 1.0
**Last Updated**: October 29, 2025
**Created by**: Claude AI Assistant
