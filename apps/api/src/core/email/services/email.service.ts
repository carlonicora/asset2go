import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as Handlebars from "handlebars";
import * as nodemailer from "nodemailer";
import { join } from "path";
import { BaseConfigInterface } from "src/common/config/interfaces/base.config.interface";
import { ConfigAppInterface } from "src/common/config/interfaces/config.app.interface";
import { ConfigEmailInterface } from "src/common/config/interfaces/config.email.interface";
import sendGridMail = require("@sendgrid/mail");

export interface EmailParams {
  to: string | string[];
  subject?: string;
  [key: string]: any;
}

type EmailAddress = {
  name: string;
  email: string;
};

@Injectable()
export class EmailService {
  private templateBasePath: string;

  constructor(private readonly config: ConfigService<BaseConfigInterface>) {
    this.templateBasePath = join(process.cwd(), "templates", "email");

    const headerPath = join(this.templateBasePath, "header.hbs");
    const footerPath = join(this.templateBasePath, "footer.hbs");

    if (fs.existsSync(headerPath)) {
      const headerPartial = fs.readFileSync(headerPath, "utf8");
      Handlebars.registerPartial("header", headerPartial);
    } else {
      console.error(`Partial header.hbs not found in ${this.templateBasePath}`);
    }
    if (fs.existsSync(footerPath)) {
      const footerPartial = fs.readFileSync(footerPath, "utf8");
      Handlebars.registerPartial("footer", footerPartial);
    } else {
      console.error(`Partial footer.hbs not found in ${this.templateBasePath}`);
    }
  }

  private loadTemplate(templateId: string, locale: string): string {
    let templatePath = join(this.templateBasePath, locale, `${templateId}.hbs`);
    if (!fs.existsSync(templatePath) && locale !== "it")
      templatePath = join(this.templateBasePath, "it", `${templateId}.hbs`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found for template "${templateId}" in locale "${locale}" or default "it".`);
    }

    let unsubscribePath = join(this.templateBasePath, locale, "unsubscribe.hbs");
    if (!fs.existsSync(unsubscribePath) && locale !== "it") {
      unsubscribePath = join(this.templateBasePath, "it", "unsubscribe.hbs");
    }
    if (fs.existsSync(unsubscribePath)) {
      const unsubscribePartial = fs.readFileSync(unsubscribePath, "utf8");
      Handlebars.registerPartial("unsubscribe", unsubscribePartial);
    }

    return fs.readFileSync(templatePath, "utf8");
  }

  async sendEmail(templateId: string, emailParams: EmailParams, locale: string): Promise<void> {
    const templateContent = this.loadTemplate(templateId, locale);
    if (!emailParams.url) emailParams.url = this.config.get<ConfigAppInterface>("app").url;

    let html;
    try {
      const template = Handlebars.compile(templateContent);
      html = template(emailParams);
    } catch (error) {
      console.error("Error compiling Handlebars template:", error);
    }

    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const extractedTitle = titleMatch ? titleMatch[1] : "";
    const to = emailParams.to;
    const subject = emailParams.subject || extractedTitle;

    try {
      switch (this.config.get<ConfigEmailInterface>("email").emailProvider) {
        case "brevo":
          await this.sendEmailWithBrevo(to, subject, html);
          break;
        case "sendgrid":
          await this.sendEmailWithSendGrid(to, subject, html);
          break;
        case "smtp":
          await this.sendEmailWithSmtp(to, subject, html);
          break;
      }
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  private async sendEmailWithSendGrid(to: string | string[], subject: string, html: string): Promise<void> {
    sendGridMail.setApiKey(this.config.get<ConfigEmailInterface>("email").emailApiKey);
    const mailOptions = {
      to: to,
      from: this.config.get<ConfigEmailInterface>("email").emailFrom,
      subject: subject,
      text: html,
      html: html,
    };

    try {
      await sendGridMail.send(mailOptions);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  private convertToEmailAddressArray(email: string | string[]): EmailAddress[] {
    const convert = (email: string): EmailAddress => {
      if (!email.includes("<")) {
        return {
          name: email,
          email: email,
        };
      }
      const [name, emailAddress] = email.split("<").map((part) => part.trim());
      return {
        name: name,
        email: emailAddress.replace(">", ""),
      };
    };

    if (typeof email === "string") {
      return [convert(email)];
    } else if (Array.isArray(email)) {
      return email.map((singleEmail) => {
        return convert(singleEmail);
      });
    } else {
      throw new Error("Invalid email address format");
    }
  }

  private async sendEmailWithBrevo(to: string | string[], subject: string, html: string): Promise<void> {
    const brevo = require("@getbrevo/brevo");
    const apiInstance = new brevo.TransactionalEmailsApi();

    apiInstance.authentications.apiKey.apiKey = this.config.get<ConfigEmailInterface>("email").emailApiKey;

    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = this.convertToEmailAddressArray(this.config.get<ConfigEmailInterface>("email").emailFrom)[0];
    sendSmtpEmail.to = this.convertToEmailAddressArray(to);

    try {
      await apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
      console.error(error);
    }
  }

  private async sendEmailWithSmtp(to: string | string[], subject: string, html: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.config.get<ConfigEmailInterface>("email").emailHost,
      port: this.config.get<ConfigEmailInterface>("email").emailPort,
      secure: this.config.get<ConfigEmailInterface>("email").emailSecure,
      auth: {
        user: this.config.get<ConfigEmailInterface>("email").emailUsername,
        pass: this.config.get<ConfigEmailInterface>("email").emailPassword,
      },
    });

    const mailOptions = {
      from: this.config.get<ConfigEmailInterface>("email").emailFrom,
      to: to,
      subject: subject,
      html: html,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Error sending SMTP email:", error);
      throw error;
    }
  }
}
