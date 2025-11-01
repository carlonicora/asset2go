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
import { errorToast } from "@/features/common/components/errors/errorToast";
import { UserInterface } from "@/features/foundations/user/data/UserInterface";
import { UserService } from "@/features/foundations/user/data/UserService";
import { Modules } from "@/modules/modules";
import { Action } from "@/permisions/types";
import withPermissions from "@/permisions/wrappers/withPermissions";
import { UserCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type UserReactivatorProps = {
  user: UserInterface;
  propagateChanges: (user: UserInterface) => void;
};

function UserReactivatorInterface({ user, propagateChanges }: UserReactivatorProps) {
  const [open, setOpen] = useState<boolean>(false);
  const t = useTranslations();

  const reactivateUser = async () => {
    try {
      const updatedUser = await UserService.reactivate({ userId: user.id });

      setOpen(false);
      propagateChanges(updatedUser);
    } catch (error) {
      errorToast({ title: t(`generic.errors.error`), error: error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserCheckIcon className="mr-3 h-3.5 w-3.5" />
          {t(`foundations.user.buttons.reactivate`)}
        </Button>
      </DialogTrigger>
      <DialogContent className={`flex max-h-[70vh] max-w-3xl flex-col overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{t(`foundations.user.reactivate.title`)}</DialogTitle>
          <DialogDescription>{t(`foundations.user.reactivate.subtitle`)}</DialogDescription>
        </DialogHeader>
        {t(`foundations.user.reactivate.description`, { name: user.name })}
        <div className="flex justify-end">
          <Button className="mr-2" variant={"outline"} type={`button`} onClick={() => setOpen(false)}>
            {t(`generic.buttons.cancel`)}
          </Button>
          <Button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              reactivateUser();
            }}
          >
            {t(`foundations.user.buttons.reactivate`)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UserReactivator(props: UserReactivatorProps) {
  return withPermissions({
    Component: UserReactivatorInterface,
    modules: [Modules.User],
    action: Action.Update,
    data: props.user,
  })(props);
}
