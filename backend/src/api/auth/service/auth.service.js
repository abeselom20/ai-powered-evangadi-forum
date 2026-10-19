import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { safeExecute } from "../../../../db/config.js";
import {
  BadRequestError,
  UnauthenticatedError,
  NotFoundError,
} from "../../../utils/errors/index.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing.");
}

const cleanEmailInput = (rawEmail) => rawEmail.trim().toLowerCase();

// One place that builds the JWT, shared by register and login so both
// endpoints hand out exactly the same kind of token.
const issueAccessToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

export const isEmailAlreadyRegistered = async (userEmail) => {
  const formattedEmail = cleanEmailInput(userEmail);
  const query = "SELECT user_id FROM users WHERE email = ? LIMIT 1";
  const records = await safeExecute(query, [formattedEmail]);
  return records.length > 0;
};

// Renamed Service Method 1
export const createNewUserAccount = async ({
  firstName,
  lastName,
  email,
  password,
}) => {
  const formattedEmail = cleanEmailInput(email);
  const isDuplicate = await isEmailAlreadyRegistered(formattedEmail);

  if (isDuplicate) {
    throw new BadRequestError("An account with this email already exists.");
  }

  const saltRounds = await bcrypt.genSalt(10);
  const encryptedPassword = await bcrypt.hash(password, saltRounds);
  const insertQuery =
    "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)";

  let queryResult;
  try {
    queryResult = await safeExecute(insertQuery, [
      firstName,
      lastName,
      formattedEmail,
      encryptedPassword,
    ]);
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      throw new BadRequestError("An account with this email already exists.");
    }
    throw err;
  }

  const user = {
    id: queryResult.insertId,
    firstName,
    lastName,
    email: formattedEmail,
  };

  // Log the new user straight in: return a token alongside the profile.
  return { user, accessToken: issueAccessToken(user) };
};

// Renamed Service Method 2
export const authenticateUserAccount = async ({ email, password }) => {
  const formattedEmail = cleanEmailInput(email);
  const findUserQuery =
    "SELECT user_id, first_name, last_name, email, password_hash FROM users WHERE email = ? LIMIT 1";
  const matchingUsers = await safeExecute(findUserQuery, [formattedEmail]);
  if (matchingUsers.length === 0) {
    throw new UnauthenticatedError("Invalid credentials provided.");
  }

  const account = matchingUsers[0];
  const isPasswordValid = await bcrypt.compare(password, account.password_hash);

  if (!isPasswordValid) {
    throw new UnauthenticatedError("Invalid credentials provided.");
  }

  const user = {
    id: account.user_id,
    firstName: account.first_name,
    lastName: account.last_name,
    email: account.email,
  };

  return { user, accessToken: issueAccessToken(user) };
};

// Renamed Service Method 3
export const fetchUserProfile = async (userId) => {
  const query =
    "SELECT user_id, first_name, last_name, email FROM users WHERE user_id = ? LIMIT 1";
  const users = await safeExecute(query, [userId]);

  if (users.length === 0) {
    throw new NotFoundError("User profile not found.");
  }

  const userRecord = users[0];
  return {
    id: userRecord.user_id,
    firstName: userRecord.first_name,
    lastName: userRecord.last_name,
    email: userRecord.email,
  };
};

export const updateUserPassword = async ({
  userId,
  currentPassword,
  newPassword,
}) => {
  const users = await safeExecute(
    "SELECT password_hash FROM users WHERE user_id = ? LIMIT 1",
    [userId],
  );

  if (users.length === 0) {
    throw new NotFoundError("User account not found.");
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    users[0].password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new BadRequestError("Current password is incorrect.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await safeExecute("UPDATE users SET password_hash = ? WHERE user_id = ?", [
    passwordHash,
    userId,
  ]);
};
