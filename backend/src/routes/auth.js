import crypto from "node:crypto";
import express from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma.js";

const router = express.Router();
const SESSION_COOKIE_NAME = "kyndelik_session";
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required. Set it in the environment before starting the app.");
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) {
          return [part, ""];
        }

        const key = part.slice(0, separatorIndex);
        const value = part.slice(separatorIndex + 1);
        return [key, decodeURIComponent(value)];
      }),
  );
}

function createSignedSession(user, impersonatorId = null) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ...(user.groupId !== undefined ? { groupId: user.groupId } : {}),
    ...(impersonatorId !== null ? { impersonatorId } : {}),
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadString)
    .digest("hex");

  return `${Buffer.from(payloadString).toString("base64url")}.${signature}`;
}

function verifySignedSession(sessionValue) {
  if (!sessionValue || typeof sessionValue !== "string") return null;

  const [payloadBase64, signature] = sessionValue.split(".");
  if (!payloadBase64 || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(Buffer.from(payloadBase64, "base64url").toString("utf8"))
    .digest("hex");

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "hex");

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf8"),
    );
    return payload;
  } catch {
    return null;
  }
}

function getSessionUser(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionValue = cookies[SESSION_COOKIE_NAME];
  return verifySignedSession(sessionValue);
}

function buildCookieHeader(name, value, maxAge) {
  const cookieParts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];

  if (process.env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

function setSessionCookie(res, user, impersonatorId = null) {
  const sessionValue = createSignedSession(user, impersonatorId);
  res.setHeader("Set-Cookie", buildCookieHeader(SESSION_COOKIE_NAME, sessionValue, 86400));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", buildCookieHeader(SESSION_COOKIE_NAME, "", 0));
}

export function requireAuth(requiredRoles = []) {
  return (req, res, next) => {
    const user = getSessionUser(req);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Требуется авторизация" });
    }

    const allowedRoles = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles];

    if (
      allowedRoles.length > 0 &&
      !allowedRoles.some((role) => user.role?.toLowerCase() === String(role).toLowerCase())
    ) {
      return res.status(403).json({ success: false, message: "Доступ запрещен" });
    }

    req.user = user;
    return next();
  };
}

router.get("/session", (req, res) => {
  const user = getSessionUser(req);

  if (!user) {
    return res.status(401).json({ success: false, message: "Не авторизован" });
  }

  return res.json({ success: true, user });
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  return res.json({ success: true });
});

router.post("/impersonate", requireAuth(["admin"]), async (req, res) => {
  const userId = Number(req.body?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: "Некорректный ID пользователя" });
  }

  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true },
    });
    if (!admin || admin.role.toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, message: "Доступ запрещен" });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, groupId: true },
    });
    if (!target) {
      return res.status(404).json({ success: false, message: "Пользователь не найден" });
    }

    const targetRole = target.role.toLowerCase();
    if (!["student", "teacher"].includes(targetRole)) {
      return res.status(400).json({ success: false, message: "Можно войти только как студент или преподаватель" });
    }

    setSessionCookie(res, target, admin.id);
    console.info(JSON.stringify({
      event: "admin_impersonation_started",
      adminId: admin.id,
      targetUserId: target.id,
    }));

    return res.json({
      success: true,
      user: { ...target, impersonatorId: admin.id },
    });
  } catch (error) {
    console.error("Ошибка при переключении пользователя:", error);
    return res.status(500).json({ success: false, message: "Не удалось переключить пользователя" });
  }
});

router.post("/impersonation/stop", requireAuth(), async (req, res) => {
  const adminId = Number(req.user.impersonatorId);
  if (!Number.isInteger(adminId) || adminId <= 0) {
    return res.status(400).json({ success: false, message: "Режим входа от имени пользователя не активен" });
  }

  try {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, name: true, role: true, groupId: true },
    });
    if (!admin || admin.role.toLowerCase() !== "admin") {
      clearSessionCookie(res);
      return res.status(403).json({ success: false, message: "Исходная учетная запись администратора недоступна" });
    }

    setSessionCookie(res, admin);
    console.info(JSON.stringify({
      event: "admin_impersonation_stopped",
      adminId: admin.id,
      targetUserId: req.user.id,
    }));

    return res.json({ success: true, user: admin });
  } catch (error) {
    console.error("Ошибка при возврате к администратору:", error);
    return res.status(500).json({ success: false, message: "Не удалось вернуться к администратору" });
  }
});

router.post("/login", async (req, res) => {
  const { email, pass, password } = req.body || {};
  const inputPassword = pass ?? password;

  if (!email || !inputPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Email и пароль обязательны" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: String(email).trim(),
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Неверный логин или пароль" });
    }

    const passwordMatches = await bcrypt.compare(String(inputPassword), user.password);
    if (!passwordMatches) {
      return res
        .status(401)
        .json({ success: false, message: "Неверный логин или пароль" });
    }

    const { password: _, ...userWithoutPassword } = user;
    setSessionCookie(res, userWithoutPassword);

    return res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Ошибка при авторизации:", error);
    return res
      .status(500)
      .json({ success: false, message: "Ошибка сервера при входе" });
  }
});

export { SESSION_COOKIE_NAME };
export default router;
