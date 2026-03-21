import type {
  RoomMode,
  UserRole,
  RoomUser,
  PendingHintRequest,
  CustomTestCase,
  RoomState,
  SupportedLanguage,
} from "@codeshare/shared";
import { ROOM_LIMITS } from "@codeshare/shared";
import { generateReconnectToken } from "../lib/reconnectToken.js";
import crypto from "node:crypto";

interface RoomUserInternal extends RoomUser {
  reconnectToken: string;
  socketId: string | null;
}

export class Room {
  readonly roomCode: string;
  readonly mode: RoomMode;
  readonly maxUsers = ROOM_LIMITS.MAX_USERS;

  users: RoomUserInternal[] = [];
  problemId: string | null = null;
  language: SupportedLanguage = "python";
  hintsUsed = 0;
  hintLimit = 0;
  pendingHintRequest: PendingHintRequest | null = null;
  customTestCases: CustomTestCase[] = [];
  hintHistory: string[] = [];
  submissionsUsed = 0;
  submissionLimit = ROOM_LIMITS.MAX_SUBMISSIONS;
  executionInProgress = false;
  hintStreaming = false;
  llmCallsUsed = 0;
  importsUsed = 0;
  readonly yjsToken: string;
  createdAt: Date;
  lastActivityAt: Date;
  gracePeriodTimers = new Map<string, NodeJS.Timeout>();

  constructor(roomCode: string, mode: RoomMode) {
    this.roomCode = roomCode;
    this.mode = mode;
    this.yjsToken = crypto.randomBytes(16).toString("hex");
    this.createdAt = new Date();
    this.lastActivityAt = new Date();
  }

  addUser(displayName: string, role: UserRole, socketId: string): RoomUserInternal {
    const user: RoomUserInternal = {
      id: crypto.randomUUID(),
      displayName,
      role,
      connected: true,
      reconnectToken: generateReconnectToken(),
      socketId,
    };
    this.users.push(user);
    this.lastActivityAt = new Date();
    return user;
  }

  removeUser(userId: string): void {
    this.users = this.users.filter((u) => u.id !== userId);
    this.gracePeriodTimers.delete(userId);
  }

  reconnectUser(userId: string, socketId: string): RoomUserInternal | null {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return null;
    user.connected = true;
    user.socketId = socketId;
    user.reconnectToken = generateReconnectToken();
    this.cancelGracePeriod(userId);
    this.lastActivityAt = new Date();
    return user;
  }

  findBySocketId(socketId: string): RoomUserInternal | null {
    return this.users.find(
      (user) => user.socketId === socketId && user.connected,
    ) ?? null;
  }

  findByReconnectToken(token: string): RoomUserInternal | null {
    return this.users.find(
      (u) => !u.connected && u.reconnectToken === token,
    ) ?? null;
  }

  startGracePeriod(userId: string, onExpire: () => void): void {
    const timer = setTimeout(() => {
      this.gracePeriodTimers.delete(userId);
      onExpire();
    }, 5 * 60 * 1000);
    this.gracePeriodTimers.set(userId, timer);
  }

  cancelGracePeriod(userId: string): void {
    const timer = this.gracePeriodTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.gracePeriodTimers.delete(userId);
    }
  }

  canExecute(): { allowed: boolean; reason?: string } {
    if (!this.problemId) {
      return { allowed: false, reason: "Select a problem before running code." };
    }
    if (this.executionInProgress) {
      return { allowed: false, reason: "Execution already in progress." };
    }
    if (this.submissionsUsed >= this.submissionLimit) {
      return { allowed: false, reason: `Session execution limit reached (${this.submissionLimit}/${this.submissionLimit}).` };
    }
    return { allowed: true };
  }

  canSwitchProblem(): { allowed: boolean; reason?: string } {
    if (this.executionInProgress) {
      return { allowed: false, reason: "Cannot switch problems while code is running." };
    }
    if (this.hintStreaming) {
      return { allowed: false, reason: "Cannot switch problems while a hint is being delivered." };
    }
    return { allowed: true };
  }

  switchProblem(problemId: string, hintLimit: number): void {
    this.problemId = problemId;
    this.hintLimit = hintLimit;
    this.hintsUsed = 0;
    this.hintHistory = [];
    this.pendingHintRequest = null;
    this.customTestCases = [];
    this.lastActivityAt = new Date();
  }

  isFull(): boolean {
    return this.users.length >= this.maxUsers;
  }

  connectedUserCount(): number {
    return this.users.filter((u) => u.connected).length;
  }

  occupiedUserCount(): number {
    return this.users.length;
  }

  toSyncPayload(): RoomState {
    return {
      roomCode: this.roomCode,
      mode: this.mode,
      maxUsers: this.maxUsers,
      users: this.users.map(({ reconnectToken: _rt, socketId: _sid, ...u }) => u),
      problemId: this.problemId,
      language: this.language,
      hintsUsed: this.hintsUsed,
      hintLimit: this.hintLimit,
      pendingHintRequest: this.pendingHintRequest,
      customTestCases: this.customTestCases,
      submissionsUsed: this.submissionsUsed,
      submissionLimit: this.submissionLimit,
      executionInProgress: this.executionInProgress,
      createdAt: this.createdAt.toISOString(),
      lastActivityAt: this.lastActivityAt.toISOString(),
    };
  }
}
