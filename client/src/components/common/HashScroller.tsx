import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component that listens for hash changes in the URL and scrolls to the 
 * corresponding element if it exists.
 */
const HashScroller: React.FC = () => {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (hash) {
            // Use a small timeout to ensure the DOM is ready
            const timeoutId = setTimeout(() => {
                const id = hash.replace('#', '');
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 300); // 300ms delay to allow page transition/data loading

            return () => clearTimeout(timeoutId);
        }
    }, [pathname, hash]);

    return null;
};

export default HashScroller;
