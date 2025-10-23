export interface ConfigEmailInterface {
  emailProvider: "sendgrid" | "smtp" | "brevo";
  emailApiKey?: string;
  emailFrom: string;
  emailHost: string;
  emailPort: number;
  emailSecure: boolean;
  emailUsername: string;
  emailPassword: string;
}
