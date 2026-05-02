export const Log = async (service: string, level: string, category: string, message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${service}] [${level.toUpperCase()}] [${category}] ${message}`);
};
