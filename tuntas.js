// Ganti bagian di dalam tanda kutip dengan URL Web App Google Script Anda
const webAppUrl = "https://script.google.com/macros/s/AKfycbwecYNmPNrr6bbhhfDSJnGqbwJk9RIe1uXccjYThvd0I5OJCmUnLUyF-Zlq3VSzFzt7WQ/exec ";
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  const response = await fetch(webAppUrl + url.search);
  const newResponse = new Response(response.body, response);
  
  // Header ini penting agar tampilan web app tidak terblokir
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  return newResponse;
}
