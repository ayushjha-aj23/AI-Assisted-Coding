import { render, screen } from '@testing-library/react';
import User from './User';

test('renders user name correctly', () => {
  const user = { name: 'John Doe' };
  render(<User user={user} />);
  const nameElement = screen.getByText(/John Doe/i);
  expect(nameElement).toBeInTheDocument();
});
