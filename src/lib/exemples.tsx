/** Photos d'exemple dessinées (aucune vraie photo) : elles montrent les angles à prendre et servent de visuels de démonstration. */
export type Vue = "face" | "dos" | "detail" | "etiquette" | "porte" | "plat" | "ensemble" | "gros-plan" | "echelle" | "emballage";

const FOND = "#e6f2f4";
const TSHIRT = "M35 12 22 20 8 38l12 8 8-7v49h44V39l8 7 12-8-14-18-13-8c-2 7-8 11-15 11s-13-4-15-11Z";
const TSHIRT_DOS = "M35 12 22 20 8 38l12 8 8-7v49h44V39l8 7 12-8-14-18-13-8c-3 3-8 4-15 4s-12-1-15-4Z";

export default function Exemple({ vue = "face", couleur = "#4a5d54", className = "" }: { vue?: Vue; couleur?: string; className?: string }) {
  const ombre = "rgba(0,0,0,.08)";
  const corps = (() => {
    switch (vue) {
      case "face": return <g transform="translate(25 70) scale(2.5)"><path d={TSHIRT} fill={couleur} /><path d="M50 12v5" stroke="#0002" /></g>;
      case "dos": return <g transform="translate(25 70) scale(2.5)"><path d={TSHIRT_DOS} fill={couleur} /><rect x="44" y="14" width="12" height="5" fill="#fff" opacity=".85" /></g>;
      case "detail": return (<g>
        <defs><clipPath id="loupe"><circle cx="150" cy="200" r="105" /></clipPath><pattern id="tissu" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="10" height="10" fill={couleur} /><rect width="10" height="3" fill="#fff" opacity=".18" /></pattern></defs>
        <circle cx="150" cy="200" r="109" fill="#fff" /><rect x="40" y="90" width="220" height="220" fill="url(#tissu)" clipPath="url(#loupe)" /><path d="M45 250 150 215l105 35" fill="none" stroke="#fff" strokeWidth="5" opacity=".6" clipPath="url(#loupe)" /></g>);
      case "etiquette": return (<g><g transform="rotate(-6 150 200)"><rect x="95" y="105" width="110" height="190" rx="6" fill="#fff" stroke="#bbb" /><circle cx="150" cy="128" r="7" fill={FOND} stroke="#bbb" />
        <text x="150" y="205" textAnchor="middle" fontSize="64" fontWeight="700" fill="#222" fontFamily="Inter,sans-serif">M</text><rect x="115" y="228" width="70" height="5" fill="#bbb" /><rect x="123" y="242" width="54" height="5" fill="#ddd" /><rect x="119" y="256" width="62" height="5" fill="#ddd" /></g></g>);
      case "porte": return (<g><circle cx="150" cy="78" r="26" fill="#d9c4b2" /><rect x="138" y="100" width="24" height="22" fill="#d9c4b2" /><g transform="translate(60 112) scale(1.8)"><path d={TSHIRT} fill={couleur} /></g><rect x="112" y="248" width="34" height="140" fill="#2f3441" /><rect x="154" y="248" width="34" height="140" fill="#2f3441" /></g>);
      case "plat": return (<g><rect x="55" y="130" width="190" height="60" rx="5" fill={couleur} /><rect x="55" y="190" width="190" height="60" rx="5" fill={couleur} opacity=".82" /><rect x="55" y="250" width="190" height="60" rx="5" fill={couleur} opacity=".64" /></g>);
      case "ensemble": return (<g><rect x="70" y="95" width="160" height="210" rx="10" fill="#cfd4d8" /><rect x="86" y="112" width="128" height="80" rx="6" fill="#4a5560" /><circle cx="110" cy="240" r="16" fill="#fff" stroke="#9aa3aa" strokeWidth="3" /><circle cx="190" cy="240" r="16" fill="#fff" stroke="#9aa3aa" strokeWidth="3" /><rect x="92" y="278" width="116" height="8" rx="4" fill="#9aa3aa" /></g>);
      case "gros-plan": return (<g><circle cx="150" cy="200" r="105" fill="#fff" /><circle cx="150" cy="200" r="62" fill="#cfd4d8" stroke="#9aa3aa" strokeWidth="6" /><circle cx="150" cy="200" r="10" fill="#9aa3aa" />{[0, 60, 120, 180, 240, 300].map((a) => <rect key={a} x="146" y="146" width="8" height="22" fill="#9aa3aa" transform={`rotate(${a} 150 200)`} />)}</g>);
      case "echelle": return (<g><rect x="95" y="105" width="110" height="145" rx="9" fill="#cfd4d8" /><rect x="109" y="119" width="82" height="52" rx="5" fill="#4a5560" /><rect x="60" y="290" width="180" height="26" fill="#e9d9a6" stroke="#b8a45e" />{Array.from({ length: 19 }, (_, i) => <rect key={i} x={64 + i * 9.4} y="290" width="1.6" height={i % 5 === 0 ? 14 : 8} fill="#7a6a2a" />)}<path d="M205 175c28 0 42 30 38 66l-8 40" stroke="#d9a98b" strokeWidth="18" strokeLinecap="round" fill="none" /></g>);
      case "emballage": return (<g><path d="M60 150 150 110l90 40v140l-90 40-90-40Z" fill="#c9a77a" /><path d="M150 110v220M60 150l90 40 90-40" stroke="#a98757" strokeWidth="3" fill="none" /><rect x="132" y="112" width="36" height="78" fill="#e8d3a8" opacity=".9" /></g>);
    }
  })();
  return (
    <svg viewBox="0 0 300 400" className={className} role="img" aria-label="Photo d'exemple" preserveAspectRatio="xMidYMid slice">
      <rect width="300" height="400" fill={FOND} />
      <ellipse cx="150" cy="372" rx="92" ry="9" fill={ombre} />
      {corps}
    </svg>
  );
}
