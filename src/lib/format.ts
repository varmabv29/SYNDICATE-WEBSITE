export function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  // Check if invalid date
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
