import readline from "readline";

const BASE_URL = "http://localhost:3000/api/v1/self-order";
const DUMMY_TABLE_UUID = "e8b61a71-4b4e-4f05-89f4-2f22e84d41e7";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function startChat() {
  console.log("🤖 Odoo Cafe Virtual Waiter CLI 🤖");
  console.log("Connecting to the backend...\n");

  // 1. Generate a valid session token directly using the auth service
  const { authService } = await import("./src/modules/self-order/services/auth.service.ts");
  const sessionToken = authService.generateCustomerToken("test-table-id");

  let messages: { role: string; text: string }[] = [];

  const askQuestion = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        console.log("Goodbye!");
        process.exit(0);
      }

      try {
        const response = await fetch(`${BASE_URL}/s/${DUMMY_TABLE_UUID}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            messages: messages,
            newMsg: input
          })
        });

        const result = await response.json();
        
        if (result.success) {
          const botText = result.data.response;
          console.log(`\nBot: ${botText}\n`);
          
          // Append to history
          messages.push({ role: "user", text: input });
          messages.push({ role: "model", text: botText });
        } else {
          console.log(`\n❌ Error: ${JSON.stringify(result.error)}\n`);
        }
      } catch (e: any) {
        console.log(`\n❌ Failed to connect: ${e.message}\n`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

startChat().catch(console.error);
