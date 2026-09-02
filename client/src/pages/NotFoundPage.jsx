import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <main>
      <h1>Page not found</h1>
      <Link to="/teams">Go to My Teams</Link>
    </main>
  );
};

export default NotFoundPage;