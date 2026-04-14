export async function executeDomTask(data: DomTaskInput) {
  // 1. Validamos el contrato
  const validData = DomTaskSchema.parse(data);
  // 2. Delegamos al Agente vía Bridge
  return await externalBridge.callAgent('tasklet', 'dom-automation', validData);
}