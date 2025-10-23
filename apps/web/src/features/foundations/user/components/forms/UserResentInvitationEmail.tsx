"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { errorToast } from "@/features/common/components/errors/errorToast";
import { UserInterface } from "@/features/foundations/user/data/UserInterface";
import { UserService } from "@/features/foundations/user/data/UserService";
import { Modules } from "@/modules/modules";
import { Action } from "@/permisions/types";
import withPermissions from "@/permisions/wrappers/withPermissions";
import { MailIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type UserResentInvitationEmailProps = {
  user: UserInterface;
};

function UserResentInvitationEmailInternal({ user }: UserResentInvitationEmailProps) {
  const [open, setOpen] = useState<boolean>(false);
  const t = useTranslations();

  const sendInvitationEmail = async () => {
    try {
      await UserService.sendInvitation({ userId: user.id });

      setOpen(false);
      toast.message(t(`foundations.user.resend_activation.email_sent`), {
        description: t(`foundations.user.resend_activation.email_sent_description`, { email: user.email }),
      });
    } catch (error) {
      errorToast({ title: t(`generic.errors.error`), error: error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button size="sm" variant={`ghost`} className="text-muted-foreground">
              <MailIcon />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{t(`foundations.user.buttons.resend_activation`)}</TooltipContent>
      </Tooltip>
      <DialogContent className={`flex max-h-[70vh] max-w-3xl flex-col overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{t(`foundations.user.resend_activation.title`)}</DialogTitle>
          <DialogDescription>{t(`foundations.user.resend_activation.subtitle`)}</DialogDescription>
        </DialogHeader>
        {t(`foundations.user.resend_activation.description`, { email: user.email })}
        <div className="flex justify-end">
          <Button className="mr-2" variant={"outline"} type={`button`} onClick={() => setOpen(false)}>
            {t(`generic.buttons.cancel`)}
          </Button>
          <Button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              sendInvitationEmail();
            }}
          >
            {t(`foundations.user.buttons.resend_activation`)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UserResentInvitationEmail(props: UserResentInvitationEmailProps) {
  return withPermissions({
    Component: UserResentInvitationEmailInternal,
    modules: [Modules.User],
    action: Action.Update,
    data: props,
  })(props);
}
