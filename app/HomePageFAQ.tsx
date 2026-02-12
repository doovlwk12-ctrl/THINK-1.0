'use client'

import { useState } from 'react'
import { MessageCircle, Layers, Target, PenTool, Clock, Shield, ChevronDown } from 'lucide-react'

export interface FAQItem {
  question: string
  answer: string
  icon: React.ComponentType<{ className?: string }>
}

interface HomePageFAQProps {
  sectionTitle: string
  items: FAQItem[]
}

export function HomePageFAQ({ sectionTitle, items }: HomePageFAQProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <section id="faq" className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-greige/30 via-blue-gray/20 to-rocky-blue/30 dark:from-charcoal-800 dark:via-charcoal-800 dark:to-charcoal-900 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-rocky-blue/5 dark:bg-rocky-blue/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-gray/5 dark:bg-blue-gray/10 rounded-full blur-3xl" />
      <div className="container mx-auto px-4 relative z-10">
        <header className="text-center mb-8 md:mb-12 lg:mb-16">
          <div className="relative inline-block bg-rocky-blue dark:bg-rocky-blue-600 text-cream px-6 py-2 rounded-none text-sm font-black mb-4 shadow-lg border-2 border-rocky-blue-400/30 dark:border-rocky-blue-400/40 flex items-center gap-2">
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cream/50 dark:border-cream/40" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cream/50 dark:border-cream/40" />
            <MessageCircle className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{sectionTitle}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-charcoal dark:text-cream mb-4 break-words">
            {sectionTitle}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-blue-gray dark:text-greige max-w-2xl mx-auto px-1">
            إجابات على أكثر الأسئلة التي تردنا
          </p>
        </header>
        <div className="max-w-4xl mx-auto space-y-6 min-w-0">
          {items.map((faq, idx) => (
            <div key={idx} className="group">
              <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-500/30 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-6 flex items-center justify-between text-right hover:bg-greige/5 dark:hover:bg-charcoal-700/50 transition-colors min-h-[2.75rem]"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-rocky-blue/10 dark:bg-rocky-blue/20 rounded-xl flex items-center justify-center border-2 border-rocky-blue/20 flex-shrink-0">
                      <faq.icon className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
                    </div>
                    <span className="text-lg font-black text-charcoal dark:text-cream group-hover:text-rocky-blue dark:group-hover:text-rocky-blue-300 transition-colors duration-300 break-words text-right">
                      {faq.question}
                    </span>
                  </div>
                  <div className={`w-10 h-10 rounded-full bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center transition-all duration-300 ${
                    openFaq === idx ? 'bg-rocky-blue dark:bg-rocky-blue-600 text-cream rotate-180' : 'text-rocky-blue dark:text-rocky-blue-300'
                  }`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-500 ${openFaq === idx ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="px-6 pb-6 pt-0">
                    <div className="pt-4 border-t border-greige/30 dark:border-charcoal-600">
                      <p className="text-base leading-relaxed text-blue-gray dark:text-greige">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
