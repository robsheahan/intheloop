import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/intheloopnew.svg"
            alt="In The Loop"
            width={500}
            height={100}
            className="h-20 w-auto"
            priority
          />
          <p className="text-sm text-muted-foreground mt-2">
            Personalized alerts for everything you track
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
