export interface PasswordStrengthReport {
  score: number; // 0 to 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  feedback: string[];
}

export class BackupUtils {
  /**
   * Evaluates a password and reports its strength score and feedback list.
   */
  public static checkPasswordStrength(password: string): PasswordStrengthReport {
    const feedback: string[] = [];
    if (!password) {
      return {
        score: 0,
        label: 'Weak',
        color: 'bg-red-500',
        feedback: ['Password cannot be empty.'],
      };
    }

    let score = 0;

    // Length check
    if (password.length >= 8) {
      score++;
    } else {
      feedback.push('Must be at least 8 characters long.');
    }

    // Complexity checks
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (hasUpper && hasLower) {
      score++;
    } else {
      feedback.push('Include both uppercase and lowercase letters.');
    }

    if (hasNumber) {
      score++;
    } else {
      feedback.push('Add at least one number.');
    }

    if (hasSpecial) {
      score++;
    } else {
      feedback.push('Use a special character (e.g. @, #, $, %).');
    }

    // Extra length bonus
    if (password.length >= 14 && score > 0) {
      score = Math.min(4, score + 1);
    }

    const labels: PasswordStrengthReport['label'][] = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

    return {
      score,
      label: labels[Math.max(0, score - 1)],
      color: colors[Math.max(0, score - 1)],
      feedback,
    };
  }

  /**
   * Formats a byte size number into a human-readable string.
   */
  public static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
