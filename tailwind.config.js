/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        ui: ['Assistant', 'system-ui', 'sans-serif'],
        alt: ['Alef', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* The spec allows exactly one line weight: a hairline at 9%. Mapping the generic
           shadcn `border`/`input` tokens onto it means every stock `border` in the UI
           primitives renders as that hairline instead of a full-opacity box. */
        border: 'hsl(var(--hairline) / var(--hairline-a))',
        input: 'hsl(var(--hairline) / var(--hairline-a))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          /* `--muted-foreground` is a full-opacity triplet, so stock `text-muted-foreground`
             rendered secondary text at primary strength. Point it at the spec's `dim`. */
          foreground: 'hsl(var(--dim) / var(--dim-a))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        stage: 'hsl(var(--stage))',
        stand: 'hsl(var(--stand))',
        score: 'hsl(var(--score))',
        lamp: 'hsl(var(--lamp))',
        status: {
          present: 'hsl(var(--status-present))',
          absent: 'hsl(var(--status-absent))',
          late: 'hsl(var(--status-late))',
          excused: 'hsl(var(--status-excused))',
          unmarked: '#a1a1aa',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
