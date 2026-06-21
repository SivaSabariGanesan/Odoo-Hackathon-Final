import "dotenv/config";

async function testPost() {
  const payload = {
    name: "Test",
    categoryId: "60f43315-469f-4e07-865f-42a4577c5530", // some uuid
    price: 100,
    taxRate: 5,
    taxType: "EXCLUSIVE",
    description: "",
    isAvailable: true
  };

  const res = await fetch("http://localhost:3000/api/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add fake admin token since we don't have the real one, wait it requires auth!
      // But Zod validation happens BEFORE auth if we don't pass token? 
      // Actually authenticate middleware is before OpenAPI validation usually.
    },
    body: JSON.stringify(payload)
  });

  console.log(res.status, await res.text());
}
testPost();
