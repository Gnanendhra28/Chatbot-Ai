import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow orb */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,255,148,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Brand */}
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center mb-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 8px var(--accent)",
              }}
            />
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
            >
              NeuralLog
            </span>
          </div>
          <h1
            className="text-3xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            Inference Observability
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign in to monitor your LLM applications
          </p>
        </div>

        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#00ff94",
              colorBackground: "#0a0a0a",
              colorInputBackground: "#111111",
              colorInputText: "#ffffff",
              colorText: "#ffffff",
              colorTextSecondary: "#9ca3af",
              colorNeutral: "#ffffff",
              borderRadius: "10px",
            },

            elements: {
              rootBox: "w-full",

              card: "bg-[#0f0f0f] border border-[#222] shadow-2xl",

              headerTitle: "!text-white font-bold text-2xl",

              headerSubtitle: "!text-gray-400",

              socialButtonsBlockButton:
                "!bg-[#151515] border border-[#222] hover:bg-[#1a1a1a]",

              socialButtonsBlockButtonText: "!text-white",

              dividerLine: "!bg-[#222]",

              dividerText: "!text-gray-500",

              formFieldLabel: "!text-gray-300",

              formFieldInput: "!bg-[#151515] !border-[#222] !text-white",

              footerActionText: "!text-gray-400",

              footerActionLink: "!text-[#00ff94]",

              formButtonPrimary:
                "!bg-[#00ff94] !text-black hover:!bg-[#00e686]",
            },
          }}
        />
      </div>
    </div>
  );
}
