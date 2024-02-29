// Try to get an adapter from the user agent.
const adapter = await navigator.gpu.requestAdapter();
if (adapter) {
  // Print out some basic details about the adapter.
  const adapterInfo = await adapter.requestAdapterInfo();
  console.log(`Found adapter: ${adapterInfo.device}`); // On some systems this will be blank
  const features = [...adapter.features.values()];
  console.log(`Supported features: ${features.join(", ")}`);
} else {
  console.error("No adapter found");
}