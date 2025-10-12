"use client";

import { Card } from "@/components/ui/card";
import { AuthContextProvider, useAuthContext } from "@/features/foundations/auth/contexts/AuthContext";
import { AuthComponent } from "@/features/foundations/auth/enums/AuthComponent";
import Image from "next/image";

type AuthContainerProps = {
  componentType: AuthComponent;
  params?: { code?: string };
};

export default function AuthContainer({ componentType, params }: AuthContainerProps) {
  return (
    <AuthContextProvider initialComponentType={componentType} initialParams={params}>
      <InnerAuthContainer />
    </AuthContextProvider>
  );
}

function InnerAuthContainer() {
  const { activeComponent } = useAuthContext();

  if (activeComponent === null)
    return (
      <div className="max-w-sm">
        <Image src="/logo.webp" alt="Asset2Go" width={100} height={100} className="animate-spin-slow" priority />
      </div>
    );

  return <Card className="w-full max-w-md">{activeComponent}</Card>;
}
