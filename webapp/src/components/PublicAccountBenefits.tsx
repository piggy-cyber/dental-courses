const BENEFITS = [
  ["Save game progress", "Return to your latest rounds and results."],
  ["Manage your profile", "Update your name, username, bio, and avatar."],
  ["Choose your appearance", "Set your theme and preferred level of motion."],
] as const;

export function PublicAccountBenefits() {
  return (
    <ul className="public-account-benefits">
      {BENEFITS.map(([title, detail], index) => (
        <li key={title}>
          <span aria-hidden="true">0{index + 1}</span>
          <div><b>{title}</b><small>{detail}</small></div>
        </li>
      ))}
    </ul>
  );
}
