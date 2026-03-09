-- Manually verify a user so they can log in without the email link.
-- Replace 'eetes@yopmail.com' with the user's email if different.
-- Run: mysql -u USER -p monash < verify-user.sql

UPDATE `users`
SET
  `is_email_verified` = 1,
  `email_verified_at` = NOW(),
  `email_verify_token` = NULL,
  `email_verify_expiry` = NULL
WHERE `email` = 'eetes@yopmail.com';

-- Check that one row was updated:
-- SELECT user_id, email, is_email_verified, email_verified_at FROM users WHERE email = 'eetes@yopmail.com';
