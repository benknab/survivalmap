export type FieldIssueError = {
  issues: readonly { path: readonly unknown[]; message: string }[];
};

export function getFieldIssue(error: FieldIssueError, field: string): string | undefined {
  return error.issues.find((issue) => issue.path[0] === field)?.message;
}
