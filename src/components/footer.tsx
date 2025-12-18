export default function Footer() {
  return (
    <footer className="border-t bg-background/80 backdrop-blur-sm py-6 mt-12">
      <div className="container mx-auto px-4">
        <div className="text-center text-sm text-muted-foreground">
          Made by{" "}
          <a
            href="https://sayele.co"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            SAYELE
          </a>
        </div>
      </div>
    </footer>
  );
}
