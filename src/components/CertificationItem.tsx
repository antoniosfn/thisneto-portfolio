interface CertificationItemProps {
  title: string;
  icon: string;
  link?: string;
}

export const CertificationItem = ({ title, icon, link }: CertificationItemProps) => {
  const content = (
    <>
      <span className="text-[20px]" aria-hidden="true">{icon}</span>
      <p className="text-[17px]">{title}</p>
    </>
  );

  if (link) {
    return (
      <a 
        href={link} 
        target="_blank" 
        rel="noopener noreferrer"
        className="py-2 flex items-center gap-2 hover:bg-muted/30 rounded-lg transition-colors px-2 -mx-2"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="py-2 flex items-center gap-2">
      {content}
    </div>
  );
};
