import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'f:/SocialAgent/.env' });

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`   ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`   ✗ FAIL: ${message}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-bypass-rate-limit': 'test-runner',
      ...(options.headers || {}),
    },
  });

  let json = null;
  const setCookie = res.headers.get('set-cookie');
  try {
    json = await res.json();
  } catch {
    // Non-JSON
  }

  return { status: res.status, headers: res.headers, setCookie, data: json };
}

async function runSuite() {
  console.log('============================================================');
  console.log('  SocialForge Production Auth & Security Verification Suite ');
  console.log('============================================================\n');

  const timestamp = Date.now();
  const testUser = {
    email: `test_sec_${timestamp}@socialforge.agency`,
    password: 'SuperSecurePassword!2026',
    fullName: 'Security Tester',
    agencyName: `Secure Agency ${timestamp}`,
    agencySlug: `sec-agency-${timestamp}`,
  };

  // --------------------------------------------------------------------------
  console.log('1. Registration & Password Strength Validation:');
  // --------------------------------------------------------------------------
  
  // 1.1 Weak password (too short)
  const weak1 = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...testUser, password: 'short' }),
  });
  assert(weak1.status === 400, 'Rejects password shorter than 8 characters (HTTP 400)');

  // 1.2 Missing uppercase
  const weak2 = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...testUser, password: 'nouppercasepassword123' }),
  });
  assert(weak2.status === 400, 'Rejects password missing uppercase letter (HTTP 400)');

  // 1.3 Missing number
  const weak3 = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...testUser, password: 'NoNumberPasswordHere!' }),
  });
  assert(weak3.status === 400, 'Rejects password missing numeric digit (HTTP 400)');

  // 1.4 Valid Registration
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser),
  });
  assert(regRes.status === 201 && regRes.data?.success, 'Successfully registers user with strong password (HTTP 201)');
  assert(Boolean(regRes.data?.data?.tokens?.accessToken), 'Returns short-lived access token');
  assert(Boolean(regRes.data?.data?.tokens?.refreshToken), 'Returns rotating refresh token');
  assert(regRes.data?.data?.user?.emailVerified === false, 'Initial account state is unverified');
  assert(regRes.setCookie && regRes.setCookie.includes('sf_access_token'), 'Sets secure HttpOnly sf_access_token cookie');

  const initialVerificationToken = regRes.data?.data?.devVerificationToken;

  // 1.5 Duplicate email collision
  const dupEmail = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...testUser,
      agencySlug: `different-slug-${timestamp}`,
    }),
  });
  assert(dupEmail.status === 409 && dupEmail.data?.error?.code === 'USER_EXISTS', 'Rejects duplicate email with HTTP 409 USER_EXISTS');

  // 1.6 Duplicate slug collision
  const dupSlug = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...testUser,
      email: `other_${timestamp}@socialforge.agency`,
    }),
  });
  assert(dupSlug.status === 409 && dupSlug.data?.error?.code === 'SLUG_EXISTS', 'Rejects duplicate tenant slug with HTTP 409 SLUG_EXISTS');

  // --------------------------------------------------------------------------
  console.log('\n2. Login Authentication & Anti-Enumeration Guards:');
  // --------------------------------------------------------------------------

  // 2.1 Nonexistent user
  const nonExist = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ghost_user_does_not_exist@apex.com', password: 'Password123!' }),
  });
  assert(nonExist.status === 401 && nonExist.data?.error?.message === 'Invalid email or password', 'Anti-enumeration: Generic error for nonexistent user');

  // 2.2 Wrong password
  const wrongPass = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testUser.email, password: 'WrongPassword!2026' }),
  });
  assert(wrongPass.status === 401 && wrongPass.data?.error?.message === 'Invalid email or password', 'Anti-enumeration: Generic error for wrong password');

  // 2.3 Correct credentials
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testUser.email, password: testUser.password }),
  });
  assert(loginRes.status === 200 && loginRes.data?.success, 'Logs in successfully with correct credentials (HTTP 200)');
  assert(loginRes.setCookie && loginRes.setCookie.includes('sf_access_token'), 'Sets HttpOnly sf_access_token cookie on login');
  assert(loginRes.setCookie && loginRes.setCookie.includes('sf_csrf_token'), 'Sets SameSite sf_csrf_token cookie on login');

  let activeAccessToken = loginRes.data?.data?.tokens?.accessToken;
  let activeRefreshToken = loginRes.data?.data?.tokens?.refreshToken;

  // --------------------------------------------------------------------------
  console.log('\n3. Brute-Force Protection & Account Lockout:');
  // --------------------------------------------------------------------------
  
  const lockoutVictim = {
    email: `lockout_${timestamp}@socialforge.agency`,
    password: 'LockoutPass!2026',
    fullName: 'Lockout Target',
    agencyName: `Lockout Agency ${timestamp}`,
    agencySlug: `lockout-agency-${timestamp}`,
  };

  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(lockoutVictim),
  });

  // Attempt 5 consecutive failed logins
  for (let i = 1; i <= 5; i++) {
    await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: lockoutVictim.email, password: 'WrongPassword' }),
    });
  }

  // 6th attempt should be locked out
  const lockedAttempt = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: lockoutVictim.email, password: lockoutVictim.password }),
  });
  assert(lockedAttempt.status === 423 && lockedAttempt.data?.error?.code === 'ACCOUNT_LOCKED', 'Locks account after 5 consecutive failures (HTTP 423 ACCOUNT_LOCKED)');

  // --------------------------------------------------------------------------
  console.log('\n4. Protected Routes & Unauthorized Access:');
  // --------------------------------------------------------------------------

  // 4.1 No credentials
  const unauth = await request('/auth/me');
  assert(unauth.status === 401 && unauth.data?.error?.code === 'UNAUTHORIZED', 'Denies access without credentials (HTTP 401)');

  // 4.2 Tampered token
  const tampered = await request('/auth/me', {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature' },
  });
  assert(tampered.status === 401 && tampered.data?.error?.code === 'INVALID_TOKEN', 'Denies access with tampered token (HTTP 401 INVALID_TOKEN)');

  // 4.3 Valid credentials
  const meRes = await request('/auth/me', {
    headers: { Authorization: `Bearer ${activeAccessToken}` },
  });
  assert(meRes.status === 200 && meRes.data?.data?.user?.email === testUser.email, 'Grants access to /me with valid access token (HTTP 200)');

  // --------------------------------------------------------------------------
  console.log('\n5. Expired Access Token Handling:');
  // --------------------------------------------------------------------------
  const expiredToken = jwt.sign(
    { userId: 'fake', email: 'fake@apex.com', tenantId: 'fake', role: 'agency_admin', tokenVersion: 1 },
    JWT_SECRET,
    { expiresIn: -10 } // Expired 10 seconds ago
  );
  const expiredRes = await request('/auth/me', {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  assert(expiredRes.status === 401 && expiredRes.data?.error?.code === 'INVALID_TOKEN', 'Rejects expired access token (HTTP 401 INVALID_TOKEN)');

  // --------------------------------------------------------------------------
  console.log('\n6. Refresh Token Rotation & Replay / Reuse Detection:');
  // --------------------------------------------------------------------------
  
  // 6.1 Normal token refresh
  const refRes1 = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: activeRefreshToken }),
  });
  assert(refRes1.status === 200 && refRes1.data?.success, 'Rotates refresh token successfully (HTTP 200)');
  
  const rotatedAccessToken = refRes1.data?.data?.tokens?.accessToken;
  const rotatedRefreshToken = refRes1.data?.data?.tokens?.refreshToken;

  assert(rotatedRefreshToken !== activeRefreshToken, 'New refresh token is distinct from previous token');
  
  // 6.2 Rotated access token works
  const meRotated = await request('/auth/me', {
    headers: { Authorization: `Bearer ${rotatedAccessToken}` },
  });
  assert(meRotated.status === 200, 'New rotated access token functions normally on protected routes');

  // 6.3 REUSE ATTACK: Attempt to use the already-rotated refresh token!
  const reuseAttack = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: activeRefreshToken }),
  });
  assert(reuseAttack.status === 401 && reuseAttack.data?.error?.code === 'SECURITY_REVOKED', 'Replay Shield: Detects token reuse and terminates family (HTTP 401 SECURITY_REVOKED)');

  // 6.4 The newly issued tokens in that family should also now be revoked!
  const revokedAccessCheck = await request('/auth/me', {
    headers: { Authorization: `Bearer ${rotatedAccessToken}` },
  });
  assert(revokedAccessCheck.status === 401, 'Sessions immediately terminated across devices upon reuse anomaly');

  // Re-login to get fresh credentials for subsequent steps
  const reLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testUser.email, password: testUser.password }),
  });
  activeAccessToken = reLogin.data?.data?.tokens?.accessToken;
  activeRefreshToken = reLogin.data?.data?.tokens?.refreshToken;

  // --------------------------------------------------------------------------
  console.log('\n7. Forgot Password & Single-Use Hashed Password Reset:');
  // --------------------------------------------------------------------------

  // 7.1 Nonexistent user forgot password
  const forgotGhost = await request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'ghost_never_existed@socialforge.agency' }),
  });
  assert(forgotGhost.status === 200 && forgotGhost.data?.message.includes('password reset instructions have been sent'), 'Anti-enumeration: Generic response for unknown email');

  // 7.2 Legitimate user forgot password
  const forgotUser = await request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: testUser.email }),
  });
  assert(forgotUser.status === 200 && Boolean(forgotUser.data?.devResetToken), 'Generates single-use hashed password reset token');
  const validResetToken = forgotUser.data?.devResetToken;

  // 7.3 Weak new password
  const weakReset = await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: validResetToken, password: 'weak' }),
  });
  assert(weakReset.status === 400, 'Rejects password reset with weak password (HTTP 400)');

  // 7.4 Invalid token
  const invalidReset = await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: 'invalid_fake_token_12345', password: 'BrandNewPassword#2026' }),
  });
  assert(invalidReset.status === 400, 'Rejects invalid reset token (HTTP 400)');

  // 7.5 Successful reset
  const newPassword = 'BrandNewPassword#2026';
  const goodReset = await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: validResetToken, password: newPassword }),
  });
  assert(goodReset.status === 200 && goodReset.data?.success, 'Resets password successfully with valid token (HTTP 200)');

  // 7.6 Single-use verification: reuse of token must fail
  const reuseReset = await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: validResetToken, password: 'AnotherPassword!2026' }),
  });
  assert(reuseReset.status === 400, 'Single-Use: Rejects already-consumed reset token');

  // 7.7 Verify old password fails and new password works
  const oldPassLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testUser.email, password: testUser.password }),
  });
  assert(oldPassLogin.status === 401, 'Old password revoked immediately after reset');

  const newPassLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testUser.email, password: newPassword }),
  });
  assert(newPassLogin.status === 200, 'New password functions properly on login');
  activeAccessToken = newPassLogin.data?.data?.tokens?.accessToken;
  activeRefreshToken = newPassLogin.data?.data?.tokens?.refreshToken;

  // --------------------------------------------------------------------------
  console.log('\n8. Email Verification Flow:');
  // --------------------------------------------------------------------------

  // 8.1 Invalid verification token
  const badVerify = await request('/auth/verify-email?token=nonexistent_token_123');
  assert(badVerify.status === 400, 'Rejects invalid email verification token (HTTP 400)');

  // 8.2 Valid email verification
  if (initialVerificationToken) {
    const goodVerify = await request(`/auth/verify-email?token=${initialVerificationToken}`);
    assert(goodVerify.status === 200 && goodVerify.data?.success, 'Verifies email address successfully (HTTP 200)');

    // Verify status reflected in /me
    const verifyMe = await request('/auth/me', {
      headers: { Authorization: `Bearer ${activeAccessToken}` },
    });
    assert(verifyMe.data?.data?.user?.emailVerified === true, 'Profile correctly reflects emailVerified = true');

    // 8.3 Single-use verification token reuse
    const reuseVerify = await request(`/auth/verify-email?token=${initialVerificationToken}`);
    assert(reuseVerify.status === 400, 'Single-Use: Rejects already-consumed email verification token');
  } else {
    assert(false, 'Verification token was not issued');
  }

  // --------------------------------------------------------------------------
  console.log('\n9. Logout & Session Termination:');
  // --------------------------------------------------------------------------
  const logoutRes = await request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: activeRefreshToken }),
  });
  assert(logoutRes.status === 200, 'Logs out successfully (HTTP 200)');
  assert(logoutRes.setCookie && logoutRes.setCookie.includes('sf_access_token=;'), 'Clears sf_access_token cookie on logout');

  // Attempt to refresh with logged out token
  const refreshLoggedOut = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: activeRefreshToken }),
  });
  assert(refreshLoggedOut.status === 401, 'Logged out refresh token is rejected upon reuse');

  // --------------------------------------------------------------------------
  console.log('\n10. Security Headers & CORS Policy:');
  // --------------------------------------------------------------------------
  const healthRes = await request('/health');
  const headers = healthRes.headers;
  assert(headers.get('x-content-type-options') === 'nosniff', 'Security Header: x-content-type-options = nosniff');
  assert(headers.get('x-frame-options') === 'DENY', 'Security Header: x-frame-options = DENY');
  assert(headers.get('x-powered-by') === null, 'Security Header: x-powered-by header is hidden');

  console.log('\n============================================================');
  console.log(`  TEST RESULTS: ${passedTests} PASS / ${failedTests} FAIL (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
