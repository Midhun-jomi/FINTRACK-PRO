import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface Companion {
  id: 'mia' | 'leo' | 'antigravity';
  name: string;
  avatarUrl: string;
  fullBodyUrl: string;
  role: string;
  intro: string;
  style: string;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private readonly apiService = inject(ApiService);

  // List of companions
  companions: Companion[] = [
    {
      id: 'mia',
      name: 'Mia',
      avatarUrl: '/avatar-mia.png',
      fullBodyUrl: '/jumping-girl.lottie',
      role: 'Zebra-Cap Financial Advisor',
      intro: 'Hey! I am Mia. Ready to smash your financial goals together? Ask me anything about your budgets or expenses!',
      style: 'Friendly & Enthusiastic'
    },
    {
      id: 'leo',
      name: 'Leo',
      avatarUrl: '/avatar-leo.png',
      fullBodyUrl: '/walking-boy.lottie',
      role: 'Cool Budgeting Buddy',
      intro: 'Yo! Leo here. Let\'s keep your cash tracker clean and simple. What\'s on your mind today?',
      style: 'Casual & Relaxed'
    },
    {
      id: 'antigravity',
      name: 'Antigravity',
      avatarUrl: '/avatar-antigravity.png',
      fullBodyUrl: '/chatbot-robot.lottie',
      role: 'Core AI Coordinator',
      intro: 'Greetings. I am Antigravity, your digital core financial logic system. I am ready to analyze your balance and tracking metrics.',
      style: 'Futuristic & Analytical'
    }
  ];

  // Selected companion (default to mia)
  activeCompanion = signal<Companion>(this.companions[0]);

  // Message history
  messages = signal<ChatMessage[]>([]);

  constructor() {
    this.loadActiveCompanion();
    this.addWelcomeMessage();
  }

  private loadActiveCompanion(): void {
    const saved = localStorage.getItem('activeCompanion');
    if (saved) {
      const found = this.companions.find(c => c.id === saved);
      if (found) {
        this.activeCompanion.set(found);
      }
    }
  }

  selectCompanion(id: 'mia' | 'leo' | 'antigravity'): void {
    const found = this.companions.find(c => c.id === id);
    if (found) {
      this.activeCompanion.set(found);
      localStorage.setItem('activeCompanion', id);
      
      // Clear history and add new welcome message for the selected companion
      this.messages.set([]);
      this.addWelcomeMessage();
    }
  }

  private addWelcomeMessage(): void {
    this.messages.update(msgs => [
      ...msgs,
      {
        sender: 'bot',
        text: this.activeCompanion().intro,
        timestamp: new Date()
      }
    ]);
  }

  sendMessage(text: string): void {
    if (!text.trim()) return;

    // Add user message
    this.messages.update(msgs => [
      ...msgs,
      {
        sender: 'user',
        text,
        timestamp: new Date()
      }
    ]);

    // Generate response from AI
    this.generateBotResponse(text);
  }

  private generateBotResponse(userText: string): void {
    const cleanText = userText.toLowerCase().trim();
    const companion = this.activeCompanion();

    // Default responses based on personality
    let botReply = '';
    
    // Help commands
    if (cleanText.includes('help') || cleanText.includes('command')) {
      botReply = `Here are some things you can ask me:\n` +
                 `• **"budget status"** - Check your monthly spending limits\n` +
                 `• **"expense check"** - View summary of recent expense items\n` +
                 `• **"savings"** - See savings goals details\n` +
                 `• **"tips"** - Get custom financial advice\n` +
                 `• **"who are you"** - Hear my personality description`;
      this.addBotMessage(botReply);
      return;
    }

    if (cleanText.includes('who are you') || cleanText.includes('personality')) {
      if (companion.id === 'mia') {
        botReply = `I am Mia! I love wearing my zebra cap and helping people budget. I\'m energetic, positive, and want you to succeed! Try typing **"tips"**!`;
      } else if (companion.id === 'leo') {
        botReply = `Just Leo! I like keeping finances chill and straightforward. No stress, just smart wallet decisions. Ask me for a **"budget status"**!`;
      } else {
        botReply = `I am Antigravity, an advanced agentic AI designed by Google DeepMind. I analyze financial statistics, trends, and help you keep your tracking logically sound!`;
      }
      this.addBotMessage(botReply);
      return;
    }

    // Dynamic Database-Driven queries
    if (cleanText.includes('budget')) {
      this.apiService.get<any>('budget').subscribe({
        next: (budgetsList: any[]) => {
          this.apiService.get<any>('transactions?type=Expense&page=1&pageSize=100').subscribe({
            next: (transRes) => {
              const totalExpenses = transRes.items.reduce((sum: number, t: any) => sum + t.amount, 0);
              
              if (budgetsList.length === 0) {
                botReply = `You haven\'t configured any monthly budgets yet. Head over to the Budgets page to create one, or type **"tips"**!`;
              } else {
                const activeBudget = budgetsList[0];
                const limit = activeBudget.monthlyLimit;
                const pct = (totalExpenses / limit) * 100;
                
                botReply = `📊 **Monthly Budget Check:**\n` +
                           `• **Limit**: ₹${limit.toLocaleString()}\n` +
                           `• **Current Spend**: ₹${totalExpenses.toLocaleString()}\n` +
                           `• **Utilization**: ${pct.toFixed(1)}%\n\n`;
                
                if (pct >= 100) {
                  botReply += `⚠️ *Alert! You have exceeded your budget! Time to cut back on discretionary spending.*`;
                } else if (pct >= 80) {
                  botReply += `⚠️ *Warning! You have utilized 80% of your budget. Slow down on non-essential purchases.*`;
                } else {
                  botReply += `✅ *Looking good! You are well within your limits. Keep tracking!*`;
                }
              }
              this.addBotMessage(botReply);
            },
            error: () => this.addBotMessage(`I failed to query your recent expenses. Please check your network connection.`)
          });
        },
        error: () => this.addBotMessage(`I couldn't fetch your budget settings right now.`)
      });
      return;
    }

    if (cleanText.includes('expense') || cleanText.includes('spend')) {
      this.apiService.get<any>('transactions?type=Expense&page=1&pageSize=5').subscribe({
        next: (res) => {
          if (res.items.length === 0) {
            botReply = `You haven't logged any expenses yet! Go to the Expenses page to record one.`;
          } else {
            botReply = `💸 **Your last 5 expenses:**\n`;
            res.items.forEach((t: any) => {
              botReply += `• ₹${t.amount.toLocaleString()} on **${t.categoryName}** (${new Date(t.date).toLocaleDateString()})\n`;
            });
          }
          this.addBotMessage(botReply);
        },
        error: () => this.addBotMessage(`Could not fetch your expense log.`)
      });
      return;
    }

    if (cleanText.includes('savings') || cleanText.includes('goal')) {
      this.apiService.get<any[]>('savings').subscribe({
        next: (goals) => {
          if (goals.length === 0) {
            botReply = `You don't have any savings goals active. You can set them up in the Savings Goals tab to stay motivated!`;
          } else {
            botReply = `🎯 **Savings Targets:**\n`;
            goals.forEach((g: any) => {
              const pct = (g.currentAmount / g.targetAmount) * 100;
              botReply += `• **${g.title}**: ₹${g.currentAmount.toLocaleString()} / ₹${g.targetAmount.toLocaleString()} (${pct.toFixed(1)}%)\n`;
            });
          }
          this.addBotMessage(botReply);
        },
        error: () => this.addBotMessage(`Could not retrieve savings goals.`)
      });
      return;
    }

    if (cleanText.includes('tips') || cleanText.includes('advice') || cleanText.includes('save')) {
      const tips = [
        "Avoid eating out for a week; restaurant expenses are usually the largest leak!",
        "Always wait 24 hours before making a non-essential purchase to eliminate impulse spending.",
        "Set up an automatic monthly transfer to your Savings Goals directly after your salary lands.",
        "Categorize all transactions immediately. Uncategorized cash vanishes without leaving tracking history!",
        "Review your recurring subscriptions and cancel any you haven't used in the past 30 days."
      ];
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      
      if (companion.id === 'mia') {
        botReply = `💡 *Mia's Pro-Tip:* "${randomTip}" Go get it! 🚀`;
      } else if (companion.id === 'leo') {
        botReply = `💡 *Leo's advice:* "${randomTip}" Keep it simple. ✌️`;
      } else {
        botReply = `💡 *Antigravity system recommendation:* "${randomTip}" This optimization path maximizes cash retention.`;
      }
      this.addBotMessage(botReply);
      return;
    }

    // Default conversational responses
    if (companion.id === 'mia') {
      botReply = `Ooh, interesting! Tell me more! Or try asking me about your **"budget"** or **"tips"**!`;
    } else if (companion.id === 'leo') {
      botReply = `Cool. I can help with **"budget status"** or show your last **"expenses"**. What do you want to see?`;
    } else {
      botReply = `Input received. Please query **"budget status"**, **"expense check"**, or **"tips"** to retrieve structured financial feedback.`;
    }

    this.addBotMessage(botReply);
  }

  private addBotMessage(text: string): void {
    // Add small simulated delay to feel natural
    setTimeout(() => {
      this.messages.update(msgs => [
        ...msgs,
        {
          sender: 'bot',
          text,
          timestamp: new Date()
        }
      ]);
    }, 600);
  }
}
