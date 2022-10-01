export enum PsMsgType {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Note = 'log',
  Trivial = 'trace'
}
export type ParserMessage = {type: PsMsgType, message: string, contextObject?:any, err?: Error};
export type ParserMessages = ParserMessage[];

export function pushMessages(messages: ParserMessages, message: ParserMessage): ParserMessages {
  messages.push(message);
  return messages;
}

export class PsStdMsg {

}
